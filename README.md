# TH Hedgehog Hunt

A buildless static web game for practicing voiced TH `/ð/` and unvoiced TH `/θ/` on PC and iPad.

## Run locally

Serve this directory with any static server, for example:

```powershell
python -m http.server 8080 --directory game
```

Then open `http://localhost:8080/`.

## GitHub Pages

The game uses only relative paths and does not need a build step. Publish the contents of `game/` as the Pages root, or copy it into a repository's `docs/` directory.

## Included behavior

- Forest map and NPC tutorial
- Three unlockable levels: 3×3, 4×4, and 5×5
- Level 1 practices unvoiced `/θ/`, Level 2 practices voiced `/ð/`, and Level 3 mixes both sounds
- 80-second timer, 10-correct target, and five hearts
- Randomized simultaneous hedgehogs with one guaranteed correct answer per wave
- Mouse, touch, keyboard-accessible buttons, portrait rotation notice, pause and mute
- Local progress and star ratings via `localStorage`
- Browser speech synthesis as a temporary pronunciation source
- Looping owner-supplied background music plus event-driven UI, movement, hammer, answer, reaction, and level-complete sound effects

## Art provenance

The C-version clay/felt direction and runtime raster assets were created with built-in image generation. The level/map backgrounds were planned as baked responsive plates; characters and props are separate transparent assets. Generated pronunciation should be replaced with reviewed human recordings before classroom release.

Sound-effect provenance and usage notes are recorded in [`sound/SOURCES.md`](sound/SOURCES.md).
