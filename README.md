# Diwali Diya (Three.js)

A small interactive 3D Diwali scene: tap the terracotta diya to light it, tap again to put it out.
Plain HTML, CSS and JavaScript. Three.js is loaded from a CDN, so you need an internet connection.

## Run it

Browsers block JavaScript modules when a page is opened by double-clicking it (`file://`),
so serve the folder with any tiny local web server. Pick one:

- **Python:** `python -m http.server 8000` in this folder, then open http://localhost:8000
- **Node:** `npx serve` in this folder
- **VS Code:** install the "Live Server" extension, right-click `index.html`, "Open with Live Server"

## Files

```
index.html        page + the import map that tells the browser where Three.js lives
style.css         full-screen canvas and the two text labels
js/
  main.js         renderer, camera, lights, tap handling, animation loop (start reading here)
  utils.js        seeded random, smoothstep, canvas texture helper
  surface.js      dark ground and hammered brass plate
  diya.js         clay bowl, oil, gold dots, cotton wick
  flame.js        3D flame shaders, flame light, glow sprites
  flowers.js      marigold petals, flowers, loose petals, soft contact shadows
  postprocess.js  depth of field, vignette, tone mapping
  sound.js        ignition sound made with the Web Audio API
```

## Easy things to tweak

| What | Where |
| --- | --- |
| Flame brightness | `LIGHT_POWER` in `js/main.js` |
| Sound volume / crackle count | `master.gain.value` and the `for` loop in `js/sound.js` |
| Flower colours | `PALETTE` in `js/flowers.js` |
| Flower sizes and positions | the two `addFlower` loops in `js/flowers.js` |
| Amount of blur | the `0.008` and `0.004` numbers in `js/postprocess.js` |
| Slow phone? | lower `mapSize` in `js/flame.js` (1024 to 512) or the petal counts in `LAYERS` (`js/flowers.js`) |