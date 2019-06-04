import { FloatColor, parseHex } from "./Color.js";
import fromEntries from "./fromEntries.js";

export type Parameter = ParameterBase &
  (RangeParameter | CheckboxParameter | ColorParameter);

export interface ParameterBase {
  key: keyof Parameters;
  label: string;
  defaultValue: any;
}

export interface CheckboxParameter extends ParameterBase {
  type: "checkbox";
  defaultValue: boolean;
}

export interface RangeParameter extends ParameterBase {
  type: "range";
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
}

export interface ColorParameter extends ParameterBase {
  type: "color";
  defaultValue: string;
}

export const parameterDefinitions: Parameter[] = [
  {
    key: "brushSize",
    label: "Size",
    type: "range",
    min: 1,
    max: 128,
    defaultValue: 0.5
  },
  {
    key: "stepSize",
    label: "Spacing",
    type: "range",
    min: 0.01,
    max: 0.25,
    defaultValue: 0.1
  },
  {
    key: "opacity",
    label: "Flow",
    type: "range",
    min: 0,
    max: 1,
    defaultValue: 1.0
  },
  {
    key: "movementMin",
    label: "Input Min",
    type: "range",
    min: 0,
    max: 20,
    defaultValue: 1.0
  },
  {
    key: "sharpness",
    label: "Sharpness",
    type: "range",
    min: 0,
    max: 1,
    defaultValue: 0.8
  },
  {
    key: "color",
    label: "Color",
    type: "color",
    defaultValue: "#333333"
  },
  {
    key: "debug",
    label: "Debug",
    type: "checkbox",
    defaultValue: false
  }
];

export type Parameters = Readonly<{
  brushSize: number;
  stepSize: number;
  opacity: number;
  color: FloatColor;
  movementMin: number;
  sharpness: number;
  debug?: boolean;
}>;

export const sanitize = (u: Partial<Parameters>): Parameters => {
  return fromEntries(
    parameterDefinitions.map(p => {
      const { key, type, defaultValue } = p;
      const v = u[key];
      if (v === undefined) {
        return [key, defaultValue];
      }
      if (type === "range") {
        const v = u[key];
        return [key, parseFloat(v as any)];
      } else if (type === "checkbox") {
        return [key, !!v];
      } else if (type === "color") {
        if (
          Array.isArray(v) &&
          v.length === 4 &&
          v.every(k => typeof k === "number")
        ) {
          return [key, v];
        } else {
          return [key, defaultValue];
        }
      } else {
        throw new Error("Unknown type");
      }
    })
  );
};
