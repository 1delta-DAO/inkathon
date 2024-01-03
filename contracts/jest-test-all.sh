#!/usr/bin/env bash
set -eu

if [ -n "${1:-}" ]; then
  variable="$1"
  test_path="./test/$variable/$variable.test.ts"
  echo "Running Jest tests with variable: $variable"
else
  test_path="./test/"
fi

echo "Opening a new terminal window for testnet fork"
gnome-terminal -- pnpm run fork-testnet

echo "Running build script"
pnpm run build

echo "Running deploy script"
pnpm run deploy

echo "Running Jest tests from path: $test_path"
jest --runInBand "$test_path"

pkill -f "pnpm run fork-testnet"