#!/usr/bin/env bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 <folder> [tsconfig.json path]"
  exit 1
fi

targetPath="$1"
tsconfigPath="$2"
codemodPath="$(dirname "$0")/codemods/snake-to-camel.js"

if [ -z "$tsconfigPath" ]; then
  node "$codemodPath" "$targetPath"
else
  node "$codemodPath" "$targetPath" "$tsconfigPath"
fi

exit $?
