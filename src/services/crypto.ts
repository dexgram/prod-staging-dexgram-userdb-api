const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export const hmacSha256Hex = async (secret: string, content: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(content));
  return toHex(signature);
};

export const timingSafeEqualHex = (leftHex: string, rightHex: string): boolean => {
  if (leftHex.length !== rightHex.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < leftHex.length; i += 1) {
    result |= leftHex.charCodeAt(i) ^ rightHex.charCodeAt(i);
  }
  return result === 0;
};
