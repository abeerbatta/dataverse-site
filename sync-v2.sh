#!/bin/sh
# Copies the current V2 branch into /v2 on main so it is viewable at <site>/v2/.
# Run from the repo root while on main:  ./sync-v2.sh
set -e
git fetch origin V2
rm -rf v2
mkdir -p v2
git archive origin/V2 | tar -x -C v2
rm -f v2/sync-v2.sh v2/.nojekyll
git add -A v2
git commit -m "Sync /v2 preview with the V2 branch" || echo "v2 already up to date"
