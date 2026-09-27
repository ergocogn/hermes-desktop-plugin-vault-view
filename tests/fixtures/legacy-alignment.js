// Historical regression fixture; never loaded by the plugin.
async function alignChunkToUtf8(bytes, offset, expected, quotedPath) {
  if (expected <= 1) return expected
  try {
    const command = 'tail -c +' + (offset + expected) + ' -- ' + quotedPath + ' | head -c 4 | od -An -tu1'
    const values = getStdout(await shellExec(command)).trim().split(/\s+/).map(Number)
    let back = 0
    for (const byte of values) {
      if (byte < 0x80 || byte > 0xBF) break
      back++
      if (back >= 3) break
    }
    if (back > 0 && expected - back > 0) return expected - back
  } catch {}
  return expected
}
