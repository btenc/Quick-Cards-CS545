export function shuffleInPlace<T>(arr: T[], startIndex = 0): void {
  for (let i = arr.length - 1; i > startIndex; i--) {
    const j = Math.floor(Math.random() * (i - startIndex + 1)) + startIndex;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
