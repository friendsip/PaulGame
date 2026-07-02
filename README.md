# The Voyages of Paul — A 3D Open-World Exploration Game

Sail the eastern Mediterranean and explore the great cities of the ancient world
from the book of Acts — Antioch, Cyprus, Ephesus, Athens, Corinth, Malta, Rome and
more. Land at each port, wander its streets on foot, and uncover its real history.

It plays like a relaxed sailing & exploration adventure — not a Bible-story app — but
every one of the 21 towns is a genuine stop on Paul's missionary journeys, with
accurate historical notes drawn from Acts and the ancient world.

Built with **Three.js**, runs entirely in the browser, no build step or install.

## Run it

You need any static web server (ES modules won't load from `file://`).

```bash
cd ntgame
python3 -m http.server 8137
# then open http://localhost:8137/index.html
```

(Or use `npx serve`, VS Code Live Server, etc.) A WebGL-capable browser is required.

## The quest

The journey is **ordered**. Your **⚓ objective** (top-left HUD, and a pulsing
marker on the maps) names the next port to reach, and the prompt at the bottom of
the screen always shows its distance and a direction arrow. You're free to roam the
whole sea and even land elsewhere to look around, but each town's **story, letter
and challenges wait** until you reach it in order — starting on the road to
**Damascus** (before the conversion, no other port will receive you).

When you first land at Damascus, the **conversion sequence** plays: the screen goes
white then black (Saul is blinded), the risen Jesus's words appear in glowing white
text, and you then play a short **2D maze minigame as Ananias**, finding your way
through "the street called Straight" to Saul. Reach him and his sight is restored —
Saul becomes Paul — and the open-world voyage begins.

## How to play

Click **Set Sail**, then:

- **At sea** — `W` sail forward · `S` reverse · `A`/`D` steer · mouse to look.
  Steer toward a port (the minimap and on-screen prompt guide you) and press `E`
  to land when you're close enough.
- **On foot** — `W A S D` walk · `Shift` run · mouse to look. Three things to do on
  every island:
  1. **Witness the event** — a dramatic scene plays automatically when you first
     land (the Philippi earthquake, the Ephesus riot, the Lystra stoning, the Malta
     viper, "I appeal to Caesar!"…). `Space`/click to advance it.
  2. **Read the history** — walk to the glowing **monument** and press `E`.
  3. **Find the letter** — a floating golden **scroll/relic** (the epistles) is
     hidden on the island; walk into it to collect it.
  Then return to the **shore** and press `E` to board and sail on.
- `J` journal · `M` sea chart (a full labelled map) · `H` help · `Space` advance a
  scene · `Esc` pause — it works everywhere, even mid-scene or mid-maze.

Goal: visit all 21 towns, witness every event, and gather all 21 letters.

## Drama & story

- **Signature cinematic event per town**, with screen-shake, full-screen flashes,
  big on-screen cries ("GREAT IS ARTEMIS OF THE EPHESIANS!"), and generated sound
  (earthquake rumble, crowd roar, thrown stones, a chime when you collect a letter).
- **A Journal (`J`)** — a two-page log: the left page reveals each town as you reach
  it (with ★ event-witnessed and 📜 letter-found badges); the right page fills with
  Luke's first-person "we" narration of the voyage so far.
- **Collectible letters/relics** — one per island, tied to the epistles and events
  (Letter to the Philippians, the Appeal to Caesar, the Unknown God inscription…).
- **Expanded history** — each town's panel now has two parts: its story in Acts and
  *"The city & its world"*, plus the lore of its letter.

## Music & extra challenges

- **Procedural Middle-Eastern music** — a calm soundbed generated live in WebAudio
  (Hijaz maqam: drone + oud + ney + a town frame-drum) that cross-fades by mood
  (sea / town / event / the Damascus conversion). Toggle with `N` or the pause menu.
- **✍ Epistle puzzles** — at several letter-ports (Derbe, Philippi, Berea, Corinth,
  Ephesus, Rome) you "write the letter" by reordering the scrambled words of a real
  verse (e.g. *"Rejoice in the Lord always…"*). Tap words in order; `Hint` always helps.
- **☀ Spread the Light** — in some towns (Antioch, Salamis, Iconium, Thessalonica)
  walk up to the dark lamps to share the good news; light them all to fill the town
  with light.
- **⛈ The Euroclydon** — as Malta becomes your objective, the storm of Acts 27
  rises: darkening sky, heaving seas, and gusts that wrench the helm until the ship
  runs aground on Malta's shore.
- The journal and HUD track all of it (`★` events, `📜` letters, `✍` epistles, `☀` lit
  towns), and everything is included in saves.

## Look & feel (golden-hour graphics)

A post-processing pipeline (Three.js `EffectComposer`) gives the world a warm,
cinematic *golden-hour Mediterranean* look:
- **Bloom** — the low sun, sun-glitter on the water, the glowing monument orbs, lit
  lamps and collectible letters all give off a soft luminous glow.
- **Golden-hour lighting** — a low amber key light with cool blue shadow fill, and a
  warm peach horizon haze that distant islands melt into.
- **Colour grade + vignette + film grain**, **shoreline foam** at every island, and
  brighter sparkling sun-glitter on the sea.
- **Graphics quality** — `L` (or the pause menu) cycles **Low / Med / High** (scales
  resolution, shadow detail and bloom). Default **Med**; drop to **Low** on weaker
  machines.

## Pause, save & load

- `Esc` opens the **pause menu** (Resume / Music / Save / Load / Quit-to-title, with a
  "do you really want to quit?" confirmation).
- **Save** downloads your progress as a local `.json`; **Load** (from the menu or the
  title screen) restores it.

## What's inside

- **Custom GLSL ocean** — animated sum-of-sines waves with fresnel reflection and a
  sun specular highlight, fading into the horizon haze.
- **Full-screen sky** — a per-pixel view-ray gradient with a sun disc and glow,
  tone-mapped (ACES) to match the rest of the scene.
- **21 hand-placed islands**, each themed by region (Levant, Cyprus, Anatolia,
  Greece, Italy) with beaches, varied rolling terrain, palms/cypress, grass, rocks,
  a paved road from the dock to the town centre, Greco-Roman landmarks (temples,
  theatres, fora, an acropolis, harbour lighthouses — all solid: you collide with
  buildings, columns and trees), houses, a dock and an interactive history monument.
- A steerable **ship** with a planked, detailed deck, first-person sailing &
  walking, a live **minimap** plus a full **sea chart** (`M`), a journey log, and
  optional procedurally-generated ambient ocean sound.

## Files

```
index.html      HUD, panels, start screen, Three.js import map
src/main.js     Engine: renderer, sky, ocean, islands, ship, controls, UI
src/data.js     The 20 towns: positions, themes, taglines, and historical notes
```

## The route (book of Acts)

Damascus → Antioch → Salamis → Paphos → Perga → Pisidian Antioch → Iconium →
Lystra → Derbe → Troas → Philippi → Thessalonica → Berea → Athens → Corinth →
Ephesus → Miletus → Caesarea → Jerusalem → Malta → Rome.
