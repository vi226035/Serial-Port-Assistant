export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

export function hexToBytes(input) {
  const normalized = input.replace(/[,\s]+/g, ' ').trim()

  if (!normalized) {
    return new Uint8Array()
  }

  const parts = normalized.split(' ')

  for (const part of parts) {
    if (!/^[0-9a-fA-F]{1,2}$/.test(part)) {
      throw new Error(`无效 HEX 字节: ${part}`)
    }
  }

  return new Uint8Array(parts.map((part) => Number.parseInt(part, 16)))
}

export function textToBytes(input) {
  return new TextEncoder().encode(input)
}

export function textWithLineEndingToBytes(input, lineEnding) {
  return textToBytes(`${input}${lineEnding}`)
}

export function bytesToText(bytes) {
  return new TextDecoder().decode(bytes)
}
