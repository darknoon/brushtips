import { PaintContextI, PaintContextWebGL } from "./PaintContext.js";
import PointProcessor, { TimedPoint } from "./PointProcessor.js";
import { Parameters, Parameter, parameterDefinitions } from "./Parameters.js";
import { colorToHex, parseHex } from "./Color.js";

const loadExample = async (example: string) => {
  return await (await fetch(`../data/${example}.json`)).json();
};

type Stroke = {
  points: TimedPoint[];
};

// Finds a dom element by id, errors if not found, type inference on expected parameter determines return type
function find<T extends HTMLElement>(id: string, expected: { new (): T }): T {
  const elem = document.getElementById(id);
  if (!elem || !(elem instanceof expected)) {
    throw new Error(`Element #${id} is ${elem}, not of type ${expected}`);
  }
  return elem as T;
}

// Fusion of https://basarat.gitbooks.io/typescript/docs/template-strings.html and ObservableHQ's html
function html(templates: TemplateStringsArray, ...placeholders: string[]) {
  let result = "";
  // Simple version w/o escaping because
  // - there is no arbitrary input
  // - we want to let you add children via templates
  // A proper templating implementation is beyond the scope of this project.
  // See https://github.com/observablehq/stdlib/blob/master/src/template.js
  for (let i = 0; i < placeholders.length; i++) {
    result += templates[i];
    result += String(placeholders[i]);
  }
  result += templates[templates.length - 1];
}

// Polyfill Object.fromEntries for type safety reasons
function fromEntries<K extends string, V>(pairs: [K, V][]): { [P in K]: V } {
  const o: any = {};
  for (let [k, v] of pairs) {
    o[k] = v;
  }
  return o;
}

type ControlsMap = { [P in keyof Parameters]: HTMLInputElement };

class Controller {
  controls = find("controls", HTMLDivElement);

  controlsMap: ControlsMap;

  createControls(): ControlsMap {
    const label = (p: Parameter) => `<label for=${p.key}>${p.label}</label>`;
    const makeControl = (p: Parameter) => {
      switch (p.type) {
        case "checkbox":
          return `<input type="checkbox" id="${p.key}"  />`;
        case "color":
          return `<input type="color" id="${p.key}" value="black" />`;
        case "range":
          return `
            <input type="range" 
              id="${p.key}"
              min="${p.min}"
              max="${p.max}"
              step="${p.step || 0.01}"
             />`;
      }
    };
    const row = (p: Parameter) => `
    <div class="control-row">
      ${label(p)}
      ${makeControl(p)}
    </div>
    `;
    // Create a div and fill it with out controls
    const doubled = document.createElement("div");
    const htmlString = parameterDefinitions.map(row).join("\n");
    doubled.innerHTML = htmlString;
    // Now, find controls we just created in the dom
    // In a normal project, we would use refs in React or would be able to
    // use DOM children in templating like ObservableHQ's html`` template literal
    this.controls.appendChild(doubled);

    return fromEntries(
      parameterDefinitions.map(({ key }) => {
        const domElement = find(key, HTMLInputElement);
        console.log("f key", key);
        domElement.oninput = this.handleParameterChange;
        // HACK: we need to assign to partial map due to lack of fromEntries
        return [key, domElement];
      })
    ) as ControlsMap;
  }

  clearButton = find("clear", HTMLButtonElement);

  strokeDataOutput = find("stroke-data-output", HTMLTextAreaElement);

  canvas = find("draw", HTMLCanvasElement);

  output: PaintContextI;

  private currentStroke: Stroke | null = null;

  constructor() {
    this.controlsMap = this.createControls();
    this.clearButton.onclick = this.clearOutput;

    // controlsMap.When our sliders change, redraw
    // this.controlsMap.size.oninput = this.handleParameterChange;
    // this.controlsMap.movementMin.oninput = this.handleParameterChange;
    // this.controlsMap.spacing.oninput = this.handleParameterChange;
    // this.controlsMap.opacity.oninput = this.handleParameterChange;
    // this.controlsMap.sharpness.oninput = this.handleParameterChange;
    // this.colorPicker.oninput = this.handleParameterChange;

    this.restoreState();

    const devicePixelRatio = window.devicePixelRatio || 1;

    const canvas = this.canvas;
    // set the size of the drawingBuffer based on the size it's displayed.
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    canvas.onmousedown = this.handleMouseDown;

    this.output = new PaintContextWebGL(canvas);

    loadExample("spiral").then(s => {
      this.currentStroke = s;
      this.showStroke(s);
      this.drawStroke(s, this.parameters);
    });
  }

  restoreState() {
    const state = sessionStorage.getItem("brushParameters");
    if (!state) return;
    const savedState = JSON.parse(state);
    this.parameters = savedState;
  }

  clearOutput = () => {
    this.output.clear();
  };

  drawStroke(stroke: Stroke, p: Parameters) {
    const pp = PointProcessor(p, this.output.drawBrush.bind(this.output));
    stroke.points.forEach(p => pp.next(p));
  }

  showStroke(stroke: Stroke) {
    this.strokeDataOutput.textContent = JSON.stringify(stroke);
  }

  get parameters(): Parameters {
    // parameterDefinitions.map(p => {
    //   if (p.type === "color") {
    //     return parseHex(this.controlsMap[key].value);
    //   } else {
    //     return this.controlsMap[key].valueAsNumber;
    //   }
    // });

    return {
      brushSize: this.controlsMap.brushSize.valueAsNumber,
      stepSize: this.controlsMap.stepSize.valueAsNumber,
      color: parseHex(this.controlsMap.color.value),
      opacity: this.controlsMap.opacity.valueAsNumber,
      movementMin: this.controlsMap.movementMin.valueAsNumber,
      sharpness: this.controlsMap.sharpness.valueAsNumber
    };

    // fromEntries(
    //   Object.entries(this.controlsMap).map(([key, input]) => [
    //     key,
    //     input.valueAsNumber
    //   ])
    // );
    // return {
    //   brushSize: this.controlsMap.size.valueAsNumber,
    //   stepSize: this.controlsMap.spacing.valueAsNumber,
    //   color: parseHex(this.colorPicker.value),
    //   opacity: this.controlsMap.opacity.valueAsNumber,
    //   movementMin: this.controlsMap.movementMin.valueAsNumber,
    //   sharpness: this.controlsMap.sharpness.valueAsNumber
    // };
  }

  set parameters(p: Parameters) {
    this.controlsMap.brushSize.valueAsNumber = p.brushSize;
    this.controlsMap.stepSize.valueAsNumber = p.stepSize;
    this.controlsMap.opacity.valueAsNumber = p.opacity;
    this.controlsMap.movementMin.valueAsNumber = p.movementMin;
    this.controlsMap.sharpness.valueAsNumber = p.sharpness;
    this.controlsMap.color.value = colorToHex(p.color);
  }

  handleParameterChange = (e: Event) => {
    this.clearOutput();
    sessionStorage.setItem("brushParameters", JSON.stringify(this.parameters));
    if (this.currentStroke) {
      this.drawStroke(this.currentStroke, this.parameters);
    }
  };

  handleMouseDown = (e: MouseEvent) => {
    const stroke: Stroke = { points: [] };

    // Create a point processor for this stroke
    const pointProcessor = PointProcessor(
      this.parameters,
      this.output.drawBrush.bind(this.output)
    );

    const startTime = e.timeStamp;

    const getRelativePosition = (e: MouseEvent) => {
      const { pageX, pageY, timeStamp: t } = e;
      const { left, top } = this.canvas.getBoundingClientRect();
      return {
        // Account for offset of element on page relative to mouse position
        x: pageX - left,
        y: pageY - top,
        // Round to the nearest millisecond to keep JSON clean
        t: Math.floor(t - startTime)
      };
    };

    const processEvent = (e: MouseEvent) => {
      const pt = getRelativePosition(e);
      pointProcessor.next(pt);
      stroke.points.push(pt);
    };

    // On mouse movement, process the event
    document.addEventListener("mousemove", processEvent);

    // Remove event listeners on mouseup
    const done = (e: MouseEvent) => {
      // Feed last event in
      processEvent(e);

      document.removeEventListener("mousemove", processEvent);
      document.removeEventListener("mouseup", done);
      this.currentStroke = stroke;
      this.showStroke(stroke);
    };
    document.addEventListener("mouseup", done);

    processEvent(e);
  };
}

const controller = new Controller();
