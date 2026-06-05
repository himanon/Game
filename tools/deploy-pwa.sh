#!/usr/bin/env bash
# Deploy the Flappy 3D PWA to GitHub Pages.
#
# Repo already has a remote: origin -> github.com/himanon/Game
# => Pages origin will be:   https://himanon.github.io/Game/
#
# Usage:
#   ./tools/deploy-pwa.sh ["commit message"]
#
# One-time setup (do once, in the browser):
#   GitHub repo himanon/Game -> Settings -> Pages -> Source = "Deploy from a branch"
#   -> Branch = main (or master) / root -> Save.  Wait ~1 min for first publish.
set -euo pipefail
cd "$(dirname "$0")/.."   # -> Game/

MSG="${1:-Deploy PWA $(date +%Y-%m-%d_%H:%M)}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "==> Regenerating service-worker precache list"
python3 tools/build-pwa-cache.py

echo "==> Committing"
git add -A
git commit -m "$MSG" || echo "(nothing to commit)"

echo "==> Pushing to origin/$BRANCH"
git push origin "$BRANCH"

ORIGIN_URL="https://himanon.github.io/Game/"
echo
echo "Pushed. Pages will publish in ~30-60s at:"
echo "  $ORIGIN_URL"
echo
echo "Verify once live:"
echo "  curl -sI ${ORIGIN_URL}flappy3d.html | head -1            # expect 200"
echo "  curl -sI ${ORIGIN_URL}manifest.webmanifest | head -1     # expect 200"
echo "  curl -s  ${ORIGIN_URL}.well-known/assetlinks.json        # served? (.nojekyll present)"
echo
echo "Then in desktop Chrome at $ORIGIN_URL :"
echo "  DevTools > Application > Service Worker = activated; toggle Offline, reload = still plays."
echo "  chrome://gpu shows WebGPU (not WebGL2 fallback)."
echo
echo "Next: bubblewrap init --manifest ${ORIGIN_URL}manifest.webmanifest   (see Phase 2 runbook)"
