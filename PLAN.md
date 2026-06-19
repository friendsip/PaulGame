# The Voyages of Paul — Improvement Plan (Challenges & Mini-Adventures)

> Scope: **improvements only** (new fun). Fixes/playability bugs are tracked separately.

## Guiding principle

**Every port is a challenge or mini-adventure** (like Ananias's maze). To make 21
ports realistic to build, we create a **small toolkit of reusable mini-game
engines** and reskin each with per-port content + story — rather than 21 one-offs.

The reward for a challenge is woven into the existing systems: you earn the port's
**letter/relic**, light up its **journal entry**, and (optionally) coins for the
**tentmaking economy**.

---

## A. The Challenge Framework  *(enabling refactor — build first)*

Generalise the current `cinematic + Ananias maze + relic pickup` into one pluggable
system. Each town gets a `challenge` (or a short sequence of them):

```
town.challenge = {
  type: 'puzzle' | 'light' | 'maze' | 'escape' | 'debate' | 'survive' | 'snake' | 'storm',
  config: { ...per-game data... },
  reward: 'letter' | 'coins' | 'companion',
}
```

Standard flow, reusing existing overlay/flash/sfx infra:
**arrive → cutscene (the event) → challenge → reward → back to open world.**
The Ananias maze becomes simply the first instance of the `maze` engine.

---

## B. Reusable mini-game engines (the toolkit)

| # | Engine | What it is | Effort | Reused by |
|---|--------|-----------|--------|-----------|
| 1 | **Epistle Puzzle** | Reorder scrambled words / fill the missing words of a real Paul verse (e.g. *"Rejoice in the Lord always…"*). "Writing a letter." | **Low** ★ | Berea, Derbe, Pisidian Antioch, Corinth, Ephesus, Philippi, Thessalonica, Rome |
| 2 | **Spread the Light** | A dark city; walk to people / light lamps to "share the good news," filling the streets with light. The thematic heart. | **Med** | Antioch, Salamis, Thessalonica, Iconium, Rome |
| 3 | **Maze / Navigation** *(have it)* | Find your way through streets/passes. | **Low** (done) | Damascus (done), Perga mountain pass |
| 4 | **Escape / Dodge** | Stealth + projectile-dodge: reach an exit while avoiding guards/stones. | **Med** | Damascus basket, Lystra stoning, Philippi jailbreak, Thessalonica/Jerusalem mobs |
| 5 | **Debate Battle** | Turn-based "verbal duel": choose the right scripture/argument response under pressure. | **Med-High** | Athens (Mars Hill), Paphos (Elymas), Caesarea trials, Gallio |
| 6 | **Snake (Malta)** | 2D reversal — the viper must navigate to bite Paul; then he shakes it off unharmed. | **Med** | Malta |
| 7 | **Storm & Shipwreck** | Sailing survival (Acts 27): ride the Euroclyon, jettison cargo, drop anchors, run aground safely. | **Med-High** | the approach to Malta |

---

## C. Cross-cutting systems

- **Letters / Epistles** — *writing* the letter (Engine 1) becomes how you earn the
  port's collectible. Adds a "Scripture" feel and ties straight into the existing
  relic/journal tracking.
- **Tentmaking Economy** *(optional, bigger — changes the core loop)* — gather
  **leather + tools → craft tents → sell for denarii → buy passage** to sail on.
  Corinth (with Aquila & Priscilla) is the natural hub. Recommend a **light version**
  or an opt-in "survival mode" so it never blocks players who just want the story.

---

## D. Port-by-port challenge map  *(so every place has something)*

| # | Port | Challenge(s) | Engine(s) |
|---|------|-------------|-----------|
| 0 | Damascus | Conversion + Ananias maze *(done)* → **escape over the wall in a basket** | maze ✓, escape |
| 1 | Antioch | Commissioned & sent; tutorial **Spread the Light** | light |
| 2 | Salamis | Preach the synagogues | light |
| 3 | Paphos | **Duel with Elymas** the sorcerer → struck blind | debate |
| 4 | Perga | Mountain-pass navigation; John Mark departs | maze |
| 5 | Pisidian Antioch | Synagogue sermon (**write/recite**) then **flee the mob** | puzzle, escape |
| 6 | Iconium | Signs & wonders (**heal**) then flee the plot | heal, escape |
| 7 | Lystra | Heal the lame man; **survive the stoning** | heal, survive |
| 8 | Derbe | Make many disciples — teaching **puzzle** (calm reward) | puzzle |
| 9 | Troas | Macedonian vision (choice); raise Eutychus (timing) | choice |
| 10 | Philippi | Free the slave girl; **earthquake jailbreak escape** | escape |
| 11 | Thessalonica | Spread the Light → **mob escape** | light, escape |
| 12 | Berea | Search the Scriptures — **epistle puzzle** (perfect fit) | puzzle |
| 13 | Athens | **Mars Hill debate battle** (marquee) | debate |
| 14 | Corinth | **Tentmaking hub** + write Corinthians + Gallio trial | economy, puzzle, debate |
| 15 | Ephesus | **Silversmith riot** (survive) + burn magic books + write Ephesians | survive, puzzle |
| 16 | Miletus | Farewell to the elders (reflective) | — |
| 17 | Caesarea | **Defense before Felix/Festus/Agrippa** → "I appeal to Caesar" | debate |
| 18 | Jerusalem | Temple riot, arrest & rescue; the Council decision | survive, choice |
| 19 | Malta | **Storm & shipwreck** → **snake bite** → heal Publius | storm, snake, heal |
| 20 | Rome | Capstone: **write the prison epistles**; preach "unhindered" | puzzle, light |

*(Two more tiny engines fall out of this — `heal` (target/timing) and `choice`
(branching moment) — both very low effort.)*

---

## E. Prioritised roadmap

### Phase 1 — Framework + the two most reusable engines *(biggest bang for buck)*
- Build the **Challenge Framework** (A) — unblocks everything.
- **Epistle Puzzle** (Engine 1) — lowest effort, highest charm, covers ~8 ports.
- **Spread the Light** (Engine 2) — the thematic core, covers ~5 ports.
- Reskin the **maze** for Perga.
- ➜ Result: ~12 ports gain a real challenge quickly.

### Phase 2 — Iconic set-pieces *(the "wow" moments people remember)*
- **Escape from Damascus** (basket over the wall).
- **Ephesus silversmith riot** (survive/calm the crowd).
- **Malta snake** (2D viper minigame).
- **Athens debate battle** (the marquee dialogue duel).

### Phase 3 — Depth & systems
- **Storm & Shipwreck** (Acts 27) → leads into Malta.
- **Tentmaking economy** (light version; Corinth hub; optional gating of passage).
- `heal` + `choice` micro-engines; fill in remaining ports; trials (Caesarea);
  balancing, difficulty, and reward tuning.

---

## Recommendation

Start with **Phase 1**. The framework is the multiplier, and the Epistle Puzzle +
Spread the Light pair instantly turns a dozen ports into real mini-adventures with
modest effort — and proves the "challenge everywhere" pattern before we invest in
the heavier set-pieces and the economy.

**Cheap early win:** the **procedural music** (Section F) is low-effort, needs no
asset files, and instantly lifts the whole mood — a good thing to slot in alongside
Phase 1.

---

## F. Music & audio atmosphere

Goal: a **vaguely Middle-Eastern, calm, pleasant** soundbed while you explore —
generated **procedurally in WebAudio** (no audio files to download), the same way the
ocean ambience and event SFX already work.

**Musical recipe**
- **Scale:** the *Hijaz* maqam — root, ♭2, 3, 4, 5, ♭6, ♭7 (semitones `[0,1,4,5,7,8,10]`).
  Its augmented-second gap is what gives the unmistakable Eastern-Mediterranean colour.
- **Layers** (each a few WebAudio oscillators with soft attack/release):
  - a low **drone** on the root (sustained, gentle detune for warmth);
  - a plucked **oud/lyre** line — sparse, improvisatory phrases wandering the scale;
  - a breathy **ney (reed-flute)** lead — long, bending notes, used sparingly;
  - an optional soft **frame-drum / darbuka** pulse for towns (off at sea).
- A simple **lookahead scheduler** (schedule ~0.1 s ahead on a timer) keeps timing
  smooth without blocking the render loop.

**Adaptive moods** (cross-fade between them):
| Context | Feel |
|---------|------|
| Sailing the open sea | drone + occasional ney; airy, spacious, no drum |
| Exploring a town on foot | add oud phrases + a light hand-drum; livelier |
| During an event/challenge | drop melody, raise tension (drums, dissonance) |
| The Damascus conversion | strip back to a single luminous drone + voice-like pads |
| Voyage complete (Rome) | full, warm, resolved phrase |

**Controls / polish:** a master **music volume** + **mute** toggle (key `N` and in the
pause menu), gentle fade-in on start, fade between moods, and ducking under cutscene
narration. Keep it quiet by default so it stays "pleasant," never intrusive.

*Effort: Low–Med. Risk: low (pure WebAudio, no assets). Recommended for Phase 1.*

---

## G. 3D challenge ideas (prefer 3D over 2D where it shines)

**Principle:** we already have a strong first-person 3D world — so the **default**
for a challenge should be to play it **in 3D**, immersing the player in the place.
Reserve flat **2D overlays** only for challenges whose metaphor is genuinely clearer
top-down or on paper (a maze map, a word/scripture puzzle, an abstract board).

### 3D versions of things currently sketched as 2D
- **Escape from Damascus → 3D night stealth.** Sneak along the city walls in
  first person, avoiding guards' torch-light cones; reach the basket and get
  **lowered down the wall** in a real first-person descent. (vs. a flat dodge game)
- **The Malta viper → 3D campfire QTE.** Gather driftwood in 3D, build the fire;
  the snake strikes your hand — a quick first-person *shake-it-off* motion/timing
  beat — then the islanders react. (keep the 2D "snake hunts Paul" only if you love it)
- **Spread the Light → fully 3D.** Walk a darkened 3D town at night; approach
  people / light street-lamps to "share the good news," each blooming into warm light
  until the whole city glows. The thematic centrepiece, and it's *made* for 3D.

### New 3D-native set-pieces
- **The Storm & Shipwreck (Acts 27).** A dramatic 3D sailing trial reusing our ocean
  & ship: towering waves, lightning, driving rain (storm sky + bigger Gerstner waves),
  steer through it, **jettison cargo** and **drop the anchors**, then run safely
  aground on Malta. The single most cinematic thing we could build.
- **The Ephesus riot (great theatre).** First-person inside the 3D theatre as a
  surging crowd of NPCs chants "Great is Artemis!" — push/weave through the press,
  reach your companions, and escape — the chant and crowd rendered in real 3D.
- **Mars Hill, Athens.** Stand on the Areopagus among 3D philosopher NPCs with the
  Acropolis behind you; the debate plays out as spoken choices *in the world* rather
  than a flat menu — turn to face whoever speaks.
- **Raising Eutychus (Troas).** A night interior: the young man slumps and falls from
  a third-storey 3D window; **race up the stairs** (3D navigation against a timer) to
  reach and revive him.
- **Healing at Lystra.** First-person laying-on-of-hands: approach the lame man, a
  gentle 3D aim/timing beat, and he leaps up and walks — done diegetically in-world.
- **The hidden believers.** In a hostile city, **find the house-church** by spotting
  the *ichthys* (fish) symbol chalked on 3D doors — a first-person clue hunt.
- **Tentmaking, in 3D.** Gather hides/tools scattered around the 3D town, bring them
  to a workbench, and craft at it via an in-world interaction (ties to the economy).
- **Night harbour piloting.** Thread a tricky harbour entrance in the dark, guided by
  a glowing 3D **lighthouse** — a precision-sailing challenge (pairs with day/night).

### Keep as 2D (clearer that way)
- **Ananias maze** *(done)* — top-down navigation reads best as a map.
- **Epistle word puzzle** — reordering/​filling text is naturally a 2D "page."

*Net effect: most challenges live in the world (immersive), with 2D reserved for the
two cases where flat presentation is genuinely better.*
