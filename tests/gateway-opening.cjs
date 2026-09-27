// Read-only compatibility check against the installed gateway classifier.
// No application is launched; only synthetic targets are classified.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const classifier = process.env.VAULT_APPROVAL_MODULE
assert.ok(classifier, 'Set VAULT_APPROVAL_MODULE to the installed approval_detection.py')
const commands = []
const sandbox = {
  console, Uint8Array, TextEncoder, TextDecoder, btoa, atob,
  host: { request: async (_, { command }) => {
    commands.push(command)
    return { result: { code: 0, stdout: command.startsWith('wslpath') ? 'C:\\Synthetic\\image.png' : '' } }
  } },
}
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8').replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.open = launchWindowsAssociation; globalThis.reveal = revealVaultFile', sandbox)
;(async () => {
  await sandbox.open("C:\\Synthetic notes\\image's $name.png")
  await sandbox.open('obsidian://open?path=C%3A%5CSynthetic%5Cnote.md')
  await sandbox.reveal('/vault/image.png')
  const python = 'import importlib.util,json,sys,pathlib\nsys.path.insert(0,str(pathlib.Path(sys.argv[1]).resolve().parent.parent))\nspec=importlib.util.spec_from_file_location("vault_classifier",sys.argv[1])\nm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\ncommands=json.load(sys.stdin)\nprint(json.dumps([{"hardline":m.detect_hardline_command(c)[0],"dangerous":m.detect_dangerous_command(c)[0]} for c in commands]))'
  const results = JSON.parse(execFileSync(process.env.VAULT_TEST_PYTHON || 'python', ['-c', python, classifier], {
    input: JSON.stringify([...commands, 'powershell.exe -EncodedCommand SQBFAFgA']), encoding: 'utf8', windowsHide: true,
  }))
  assert.equal(results.pop().dangerous, true, 'classifier reproduces the reported encoded-command block')
  results.forEach((result, index) => assert.deepEqual(result, { hardline: false, dangerous: false }, 'command ' + index))
  console.log('Vault View gateway opening: OK (encoded regression reproduced; explicit association/URI/reveal commands accepted by classifier)')
})().catch(error => { console.error(error); process.exitCode = 1 })
