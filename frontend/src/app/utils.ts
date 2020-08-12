export function generateRandomHex(len = 16) {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(len));

  return Array.from(randomBytes)
    .map((b) => b.toString(16))
    .join('');
}
