#!/usr/bin/env bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 <folder>"
  exit 1
fi

targetPath="$1"
codemodPath="$(dirname "$0")/codemods/snake-to-camel.js"

npx jscodeshift \
  -t "$codemodPath" \
  "$targetPath" \
  --extensions=ts,tsx \
  --ignore-pattern '**/node_modules/**' \
  --ignore-pattern '**/dist/**' \
  --ignore-pattern '**/build/**' \
  --ignore-pattern '**/out/**'

exit $?
