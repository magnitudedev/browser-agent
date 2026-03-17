#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../packages/magnitude-core"

VERSION=$(node -p "require('./package.json').version")

echo "=== Dry run: contents of @ddwang/magnitude-core@$VERSION ==="
npm pack --dry-run
echo ""

echo "Publishing @ddwang/magnitude-core@$VERSION. Press enter to continue, Ctrl+C to abort."
read

npm publish --access public
