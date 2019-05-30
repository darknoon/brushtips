export type FloatColor = [number, number, number, number];

export function parseHex(str: string): FloatColor {
  if (str[0] == "#") {
    const r = parseInt(str.substr(1, 2), 16) / 255;
    const g = parseInt(str.substr(3, 2), 16) / 255;
    const b = parseInt(str.substr(5, 2), 16) / 255;
    return [r, g, b, 1];
  }
  return [0, 0, 0, 1];
}

export function colorToHex(color: FloatColor): string {
  let [r, g, b] = color;
  const { floor } = Math;
  const toHex = (n: number) => {
    const d = floor(n * 255);
    // 16 = hexadecimal
    const h = d.toString(16);
    // String can be 1 or 2 digits
    return h.padStart(2, "0");
  };
  return "#" + [r, g, b].map(toHex).join("");
}
