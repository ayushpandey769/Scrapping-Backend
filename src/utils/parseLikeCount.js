export function parseLikeCount(text = "") {
  if (!text) return 0;

  const lower = text.toLowerCase();

  if (lower.includes("you and")) {
    const match = lower.match(/you and (\d+)/);
    if (match) return Number(match[1]) + 1;
    return 1;
  }

  if (lower.includes("you reacted")) {
    return 1;
  }

  const numMatch = lower.match(/(\d+)/);
  if (numMatch) {
    return Number(numMatch[1]);
  }

  return 0;
}
