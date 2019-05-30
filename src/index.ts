import { PaintContextI, PaintContextWebGL } from "./PaintContext.js";
import PointProcessor, { TimedPoint } from "./PointProcessor.js";
import { Parameters } from "./Parameters.js";
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

class Controller {
  // Find dom elements during construction
  sizeSlider = find("size-slider", HTMLInputElement);
  spacingSlider = find("spacing-slider", HTMLInputElement);
  opacitySlider = find("opacity-slider", HTMLInputElement);
  blurSlider = find("blur-slider", HTMLInputElement);
  clearButton = find("clear", HTMLButtonElement);
  movementMinSlider = find("movement-min-slider", HTMLInputElement);
  colorPicker = find("color-picker", HTMLInputElement);

  strokeDataOutput = find("stroke-data-output", HTMLTextAreaElement);

  canvas = find("draw", HTMLCanvasElement);

  output: PaintContextI;

  private currentStroke: Stroke | null = null;

  constructor() {
    this.clearButton.onclick = this.clearOutput;

    // When any of our sliders change, redraw
    this.sizeSlider.oninput = this.handleParameterChange;
    this.movementMinSlider.oninput = this.handleParameterChange;
    this.spacingSlider.oninput = this.handleParameterChange;
    this.opacitySlider.oninput = this.handleParameterChange;
    this.blurSlider.oninput = this.handleParameterChange;
    this.colorPicker.oninput = this.handleParameterChange;

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
    return {
      brushSize: this.sizeSlider.valueAsNumber,
      stepSize:
        0.2 * this.sizeSlider.valueAsNumber * this.spacingSlider.valueAsNumber,
      color: parseHex(this.colorPicker.value),
      opacity: this.opacitySlider.valueAsNumber,
      movementMin: this.movementMinSlider.valueAsNumber,
      blur: this.blurSlider.valueAsNumber
    };
  }

  set parameters(p: Parameters) {
    this.sizeSlider.valueAsNumber = p.brushSize;
    this.spacingSlider.valueAsNumber = p.stepSize;
    this.opacitySlider.valueAsNumber = p.opacity;
    this.movementMinSlider.valueAsNumber = p.movementMin;
    this.blurSlider.valueAsNumber = p.blur;
    this.colorPicker.value = colorToHex(p.color);
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
