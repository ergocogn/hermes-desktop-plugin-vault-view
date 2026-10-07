// Candidate verification runner; official admission and native checks stay separate.
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const args = process.argv.slice(2)
if (args.some(arg => arg !== '--browser')) {
  console.error('Usage: node tests/verify.cjs [--browser]')
  process.exit(2)
}
const root = path.resolve(__dirname, '..')
const suites = ['package', 'run-tests', 'catalog-policy', 'workspace-tabs', 'session-workspaces', 'file-bytes', 'io-diagnostics', 'progressive-reading', 'attachment-opening', 'image-preview', 'image-boundary', 'scan-isolation']
if (args.includes('--browser')) suites.push('editor-browser')
const commands = [['--check', path.join(root, 'plugin.js')], ...suites.map(name => [path.join(__dirname, name + '.cjs')])]
for (const command of commands) {
  const result = spawnSync(process.execPath, command, { cwd: root, env: process.env, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    console.error('Verification failed:', command[0], result.error?.message || result.signal || result.status)
    process.exit(result.status || 1)
  }
}
console.log('Candidate verification passed:', suites.join(', '))
if (!args.includes('--browser')) console.log('NOT RUN: browser suite (use --browser with Playwright/Chromium available).')
console.log('SEPARATE CHECKS REQUIRED: current upstream rule review, official validators, WSL integration as applicable, live Hermes and native OS validation. No release was created.')
