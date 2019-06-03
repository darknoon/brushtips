import { FloatColor } from "./Color.js";

export type Parameter = RangeParameter | CheckboxParameter | ColorParameter;

export interface ParameterBase {
  key: string;
  label: string;
}

export interface CheckboxParameter extends ParameterBase {
  type: "checkbox";
  default: boolean;
}

export interface RangeParameter extends ParameterBase {
  type: "range";
  min: number;
  max: number;
  step?: number;
  default: number;
}

export interface ColorParameter extends ParameterBase {
  type: "color";
  default: string;
}

export const parameterDefinitions: Parameter[] = [
  {
    key: "brushSize",
    label: "Size",
    type: "range",
    min: 1,
    max: 128,
    default: 0.5
  },
  {
    key: "stepSize",
    label: "Spacing",
    type: "range",
    min: 0.01,
    max: 0.25,
    default: 0.1
  },
  {
    key: "opacity",
    label: "Flow",
    type: "range",
    min: 0,
    max: 1,
    default: 1.0
  },
  {
    key: "movementMin",
    label: "Movement Min",
    type: "range",
    min: 0,
    max: 20,
    default: 1.0
  },
  {
    key: "sharpness",
    label: "Sharpness",
    type: "range",
    min: 0,
    max: 1,
    default: 0.8
  },
  {
    key: "color",
    label: "Color",
    type: "color",
    default: "#333333"
  }
];

console.log("parameterDefinitions", parameterDefinitions);

export type Parameters = {
  brushSize: number;
  stepSize: number;
  opacity: number;
  color: FloatColor;
  movementMin: number;
  sharpness: number;
  debug?: boolean;
};
