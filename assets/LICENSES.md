# Asset Licenses

All visual assets in this folder are **original work created for Flapster** and released
into the **public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)**.
You may use, modify, and redistribute them for any purpose without attribution.

They are generated procedurally (as SVG) by `tools/gen_assets.mjs` and are therefore fully
reproducible and license-clean — no third-party art packs are bundled.

## Contents
| Path | Description |
|------|-------------|
| `bg/<theme>/{sky,far,mid,near}.svg` | 4-layer parallax backdrop per theme (hills, space, ocean, ruins) |
| `overlay/{clouds,fog,lightshaft,vignette,lensdirt}.svg` | Atmosphere / lens overlays |
| `sprites/pipe_<theme>.svg` | Themed pipe/obstacle art (optional; the game ships a higher-fidelity procedural pipe by default) |
| `sprites/bird.svg` | 4-frame bird sprite sheet (optional; procedural bird is used by default) |

## A note on the art-pack source
The original plan was to download ready-made CC0 packs (Kenney / OpenGameArt / CraftPix).
In this build environment those CDNs were blocked by the network policy (HTTP 403) and no
raster tooling (ImageMagick/PIL) was available, so the art was instead authored as original
CC0 SVG — which has the added benefit of being scalable, tiny (~144 KB total), seamless, and
perfectly matched to each theme. Re-run `node tools/gen_assets.mjs` to regenerate or tweak.

## Audio
Sound remains **synthesized at runtime** via the Web Audio API (no audio files). The ambient
music was upgraded from a single 55 Hz hum to a per-theme detuned chord pad with a slow
filter sweep (see `startAmbientHum` in the HTML). This keeps the game dependency-free and
avoids shipping audio of uncertain license.
