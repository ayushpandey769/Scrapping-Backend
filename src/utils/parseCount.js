export function parseCount(text = "") {
  const num = text.replace(/[^0-9]/g, "");
  return num ? Number(num) : 0;
}
