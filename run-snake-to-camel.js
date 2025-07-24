#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node run-snake-to-camel.js <folder>');
  process.exit(1);
}

const targetPath = process.argv[2];
const codemodPath = path.join(__dirname, 'codemods', 'snake-to-camel.js');

const result = spawnSync(
  'npx',
  [
    'jscodeshift',
    '-t', codemodPath,
    targetPath,
    '--extensions=ts,tsx',
    '--ignore-pattern', '**/node_modules/**',
    '--ignore-pattern', '**/dist/**',
    '--ignore-pattern', '**/build/**',
    '--ignore-pattern', '**/out/**',
  ],
  { stdio: 'inherit' }
);

process.exit(result.status); 