// ============================================================================
//  Arcade challenges — five standalone mini-games for the Challenges menu.
//
//  Every game is failable: lose and it restarts instantly (attempt counter
//  rises); from the third attempt strong hints appear. Each game is a scene
//  on a shared letterboxed 960×600 canvas driven by the runner at the bottom:
//    { id, icon, title, tagline, controls, hintNote, create(env) }
//  create() returns { update(dt, ts), draw(c, ts) } and ends the round by
//  calling env.win(msg) / env.lose(msg).
// ============================================================================

const VW = 960, VH = 600;                 // logical view (letterboxed to fit)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const rand = (a, b) => a + Math.random() * (b - a);

function keyDir(keys) {                   // WASD / arrows → unit direction
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (dx || dy) { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
  return { dx, dy };
}

function label(c, txt, x, y, col, size = 13) {
  c.font = `600 ${size}px Georgia, serif`; c.textAlign = 'center';
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(txt, x + 1, y + 1);
  c.fillStyle = col; c.fillText(txt, x, y);
}

function bar(c, x, y, w, h, frac, fill, back = 'rgba(0,0,0,.45)') {
  c.fillStyle = back; c.fillRect(x, y, w, h);
  c.fillStyle = fill; c.fillRect(x, y, w * clamp(frac, 0, 1), h);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.strokeRect(x, y, w, h);
}

// ----------------------------------------------------------------------------
//  1. The Viper of Malta — gather brushwood while the snake hunts you (Acts 28)
// ----------------------------------------------------------------------------
const viper = {
  id: 'viper', icon: '🐍', title: 'The Viper of Malta',
  tagline: 'Gather all the brushwood for the fire — but a viper hunts the gatherer',
  controls: 'W A S D to move',
  hintNote: 'The viper has grown sluggish in the rain…',
  create(env) {
    const AR = { x0: 70, y0: 95, x1: 890, y1: 560 };            // the beach
    const paul = { x: 480, y: 500 };
    const fire = { x: 480, y: 300 };
    const sticks = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rand(-0.25, 0.25);
      sticks.push({ x: 480 + Math.cos(a) * rand(190, 330), y: 315 + Math.sin(a) * rand(130, 200), got: false });
    }
    for (const s of sticks) { s.x = clamp(s.x, AR.x0 + 25, AR.x1 - 25); s.y = clamp(s.y, AR.y0 + 25, AR.y1 - 25); }
    const hint = env.fails >= 2;
    const segs = Array.from({ length: 18 }, () => ({ x: 110, y: 130 }));
    let got = 0, t = 0;
    return {
      update(dt) {
        t += dt;
        const d = keyDir(env.keys), sp = 195;
        paul.x = clamp(paul.x + d.dx * sp * dt, AR.x0 + 12, AR.x1 - 12);
        paul.y = clamp(paul.y + d.dy * sp * dt, AR.y0 + 12, AR.y1 - 12);
        for (const s of sticks) if (!s.got && dist(paul.x, paul.y, s.x, s.y) < 22) { s.got = true; got++; env.sfx.chime?.(); }
        // the viper: homes on Paul with a slither, faster with every stick
        const vsp = (hint ? 96 : 122) + got * 14;
        const h = segs[0];
        const ang = Math.atan2(paul.y - h.y, paul.x - h.x) + Math.sin(t * 6) * 0.35;
        if (t > 1.4) { h.x += Math.cos(ang) * vsp * dt; h.y += Math.sin(ang) * vsp * dt; }
        for (let i = 1; i < segs.length; i++) {           // body follows at fixed spacing
          const p = segs[i - 1], s = segs[i], dd = dist(s.x, s.y, p.x, p.y);
          if (dd > 11) { const k = (dd - 11) / dd; s.x += (p.x - s.x) * k; s.y += (p.y - s.y) * k; }
        }
        if (t > 1.4 && dist(paul.x, paul.y, h.x, h.y) < 17)
          return env.lose('The viper strikes! Shake it off and gather again.');
        if (got === 8 && dist(paul.x, paul.y, fire.x, fire.y) < 42)
          env.win('You shake the beast into the flames — and suffer no harm.');
      },
      draw(c, ts) {
        c.fillStyle = '#0d1b28'; c.fillRect(0, 0, VW, VH);                      // night sea
        c.fillStyle = '#c9b083'; c.fillRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0); // sand
        c.strokeStyle = '#8a7451'; c.lineWidth = 3; c.strokeRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0);
        // fire
        const lit = got === 8, fl = 0.7 + 0.3 * Math.sin(ts * 0.01);
        c.beginPath(); c.arc(fire.x, fire.y, 34, 0, 7); c.fillStyle = lit ? `rgba(255,160,60,${0.25 * fl})` : 'rgba(60,45,30,.5)'; c.fill();
        c.beginPath(); c.arc(fire.x, fire.y, 14, 0, 7); c.fillStyle = lit ? '#ffb347' : '#4a3a26'; c.fill();
        label(c, lit ? 'the fire — bring yourself to it!' : 'the fire (needs all the wood)', fire.x, fire.y - 44, '#ffd27f');
        for (const s of sticks) if (!s.got) {
          c.strokeStyle = '#6e4a2c'; c.lineWidth = 4;
          c.beginPath(); c.moveTo(s.x - 9, s.y + 7); c.lineTo(s.x + 9, s.y - 7); c.stroke();
          c.beginPath(); c.moveTo(s.x - 8, s.y - 6); c.lineTo(s.x + 8, s.y + 6); c.stroke();
        }
        // viper
        for (let i = segs.length - 1; i >= 1; i--) {
          const s = segs[i];
          c.beginPath(); c.arc(s.x, s.y, 7 - i * 0.18, 0, 7); c.fillStyle = i % 2 ? '#3f7a3a' : '#356a32'; c.fill();
        }
        const h = segs[0];
        c.beginPath(); c.arc(h.x, h.y, 8.5, 0, 7); c.fillStyle = '#4f9a48'; c.fill();
        c.fillStyle = '#ffec9e'; c.fillRect(h.x - 4, h.y - 3, 2.5, 2.5); c.fillRect(h.x + 1.5, h.y - 3, 2.5, 2.5);
        label(c, 'the viper', h.x, h.y - 14, '#b6f0a8');
        // Paul
        c.beginPath(); c.arc(paul.x, paul.y, 11, 0, 7); c.fillStyle = '#7fc4ff'; c.fill();
        c.lineWidth = 2; c.strokeStyle = '#dff0ff'; c.stroke();
        label(c, 'Paul', paul.x, paul.y - 18, '#cfe8ff');
        label(c, `Brushwood ${got}/8`, VW / 2, 96, '#ffd27f', 18);
      },
    };
  },
};

// ----------------------------------------------------------------------------
//  2. Over the Wall — lower the basket past the watching guards (Acts 9:25)
// ----------------------------------------------------------------------------
const wall = {
  id: 'wall', icon: '🧺', title: 'Over the Wall',
  tagline: 'Lower Saul’s basket down the Damascus wall — freeze when a guard looks out',
  controls: 'hold S / ↓ / Space to lower — release to hang still',
  hintNote: 'The guards are drowsy tonight — their lamps glow longer before they look.',
  create(env) {
    const hint = env.fails >= 2;
    const WX = 430;                                       // face of the wall
    const windows = [150, 250, 350, 460].map(y => ({
      y, t: rand(0, 4),
      dark: rand(2.6, 3.9), warn: hint ? 2.1 : 1.1, lit: hint ? 1.1 : 1.55,
    }));
    const basket = { y: 82, v: 0, sway: 0 };
    return {
      update(dt, ts) {
        const down = env.keys['KeyS'] || env.keys['ArrowDown'] || env.keys['Space'];
        if (down) basket.v = Math.min(basket.v + 340 * dt, 215);
        else basket.v *= Math.exp(-6.5 * dt);
        basket.y += basket.v * dt;
        basket.sway = Math.sin(ts * 0.004) * (2 + basket.v * 0.05);
        for (const w of windows) {
          w.t += dt;
          const cyc = w.dark + w.warn + w.lit;
          if (w.t > cyc) w.t -= cyc;
          const lit = w.t > w.dark + w.warn;
          if (lit && Math.abs(basket.y - w.y) < 58 && basket.v > 15)
            return env.lose('“Who goes there?!” — a guard spies the creaking basket.');
        }
        if (basket.y >= 532) env.win('The basket touches the earth — Saul slips away into the night.');
      },
      draw(c) {
        c.fillStyle = '#0a1420'; c.fillRect(0, 0, VW, VH);                      // night
        c.fillStyle = '#e8e3cf'; c.beginPath(); c.arc(820, 90, 26, 0, 7); c.fill();   // moon
        c.fillStyle = '#3a3125';                                               // the wall
        c.fillRect(0, 0, WX, VH);
        c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
        for (let y = 0; y < VH; y += 26) for (let x = (y / 26) % 2 ? 0 : 30; x < WX; x += 60)
          c.strokeRect(x, y, 60, 26);
        c.fillStyle = '#241c12'; c.fillRect(0, 545, VW, VH - 545);              // ground
        for (const w of windows) {                                             // windows & guards
          const cyc = w.dark + w.warn + w.lit;
          const ph = w.t < w.dark ? 'dark' : w.t < w.dark + w.warn ? 'warn' : 'lit';
          c.fillStyle = ph === 'dark' ? '#141019' : ph === 'warn' ? '#7a5a20' : '#ffca6a';
          c.fillRect(WX - 66, w.y - 26, 52, 52);
          c.strokeStyle = '#1a140c'; c.lineWidth = 3; c.strokeRect(WX - 66, w.y - 26, 52, 52);
          if (ph === 'lit') {
            c.beginPath(); c.arc(WX - 40, w.y + 2, 9, 0, 7); c.fillStyle = '#4a3320'; c.fill();  // guard head
            c.fillStyle = 'rgba(255,200,110,.16)';
            c.beginPath(); c.moveTo(WX - 14, w.y - 22); c.lineTo(WX + 190, w.y - 62); c.lineTo(WX + 190, w.y + 66); c.lineTo(WX - 14, w.y + 26); c.closePath(); c.fill();
          }
        }
        const bx = WX + 46 + (Math.abs(basket.v) < 5 ? 0 : Math.round((basket.y * 7) % 3) - 1); // rope & basket
        c.strokeStyle = '#c9b083'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx, basket.y - 12); c.stroke();
        c.fillStyle = '#8a5a2c'; c.fillRect(bx - 20, basket.y - 12, 40, 26);
        c.strokeStyle = '#5a3a1a'; c.strokeRect(bx - 20, basket.y - 12, 40, 26);
        c.beginPath(); c.arc(bx, basket.y - 4, 8, 0, 7); c.fillStyle = '#7fc4ff'; c.fill();      // Saul peeking
        label(c, 'Saul', bx + 34, basket.y, '#cfe8ff');
        bar(c, VW / 2 - 120, 92, 240, 10, (basket.y - 82) / 450, '#7fc4ff');
        label(c, basket.v > 15 ? '…the rope creaks…' : 'hanging silent', VW / 2, 124, basket.v > 15 ? '#ffb98a' : '#9fc4dc');
      },
    };
  },
};

// ----------------------------------------------------------------------------
//  3. The Midnight Jailer — the doors fly open; account for every prisoner
//     before dawn, or answer for it with your life (Acts 16)
// ----------------------------------------------------------------------------
const jailer = {
  id: 'jailer', icon: '⚡', title: 'The Midnight Jailer',
  tagline: 'The earthquake bursts every door — catch all 8 prisoners in the dark before dawn',
  controls: 'W A S D to move · your lantern lights the way',
  hintNote: 'Your eyes have grown used to the dark — the prisoners show faintly through it.',
  create(env) {
    const T = 40;
    const MAP = [
      '########################',
      '#....#....#....#.......#',
      '#....#....#....#.......#',
      '#....#....#....#.......#',
      '##D####D####D#####D#####',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#......................#',
      '##D#####D####D#####D####',
      '#....#.....#....#......#',
      '#....#.....#....#......#',
      '#....#.....#....#......#',
      '########################',
    ];
    const hint = env.fails >= 2;
    const solid = (x, y, open) => {
      const gx = Math.floor(x / T), gy = Math.floor(y / T);
      if (gx < 0 || gy < 0 || gy >= MAP.length || gx >= MAP[0].length) return true;
      const ch = MAP[gy][gx];
      return ch === '#' || (ch === 'D' && !open);
    };
    const blocked = (x, y, r, open) =>
      solid(x - r, y - r, open) || solid(x + r, y - r, open) || solid(x - r, y + r, open) || solid(x + r, y + r, open);
    const cellC = (c0, c1, r0, r1) => ({ x: ((c0 + c1 + 1) / 2) * T, y: ((r0 + r1 + 1) / 2) * T });
    const cells = [
      cellC(1, 4, 1, 3), cellC(6, 9, 1, 3), cellC(11, 14, 1, 3), cellC(16, 22, 1, 3),
      cellC(1, 4, 11, 13), cellC(6, 10, 11, 13), cellC(12, 15, 11, 13), cellC(17, 22, 11, 13),
    ];
    const pris = cells.map(p => ({ x: p.x, y: p.y, dx: 0, dy: 0, t: 0, secured: false }));
    const me = { x: 480, y: 300 };
    let quakeT = 2.4, dawn = hint ? 105 : 80, caught = 0, rumbled = false;
    return {
      update(dt, ts) {
        if (quakeT > 0) {                                     // the earthquake — doors burst open
          if (!rumbled) { env.sfx.rumble?.(); rumbled = true; }
          quakeT -= dt;
          return;
        }
        dawn -= dt;
        if (dawn <= 0) return env.lose('Dawn — and prisoners missing. The magistrates will hear of it…');
        const d = keyDir(env.keys), sp = 165, r = 11;
        const nx = me.x + d.dx * sp * dt; if (!blocked(nx, me.y, r, true)) me.x = nx;
        const ny = me.y + d.dy * sp * dt; if (!blocked(me.x, ny, r, true)) me.y = ny;
        for (const p of pris) {
          if (p.secured) continue;
          const dm = dist(p.x, p.y, me.x, me.y);
          if (dm < 24) { p.secured = true; caught++; env.sfx.chime?.(); continue; }
          if (dm < 165) {                                     // flee the lantern
            const l = dm || 1; p.dx = (p.x - me.x) / l; p.dy = (p.y - me.y) / l; p.t = 0.4;
          } else {
            p.t -= dt;
            if (p.t <= 0) { const a = rand(0, Math.PI * 2); p.dx = Math.cos(a); p.dy = Math.sin(a); p.t = rand(0.7, 1.6); }
          }
          const psp = dm < 165 ? 120 : 62, pr = 9;
          const px = p.x + p.dx * psp * dt, py = p.y + p.dy * psp * dt;
          let moved = false;
          if (!blocked(px, p.y, pr, true)) { p.x = px; moved = true; }
          if (!blocked(p.x, py, pr, true)) { p.y = py; moved = true; }
          if (!moved) p.t = 0;                                // cornered — pick a new way
        }
        if (caught === 8) env.win('“Do yourself no harm — we are all here!” Every soul accounted for.');
      },
      draw(c, ts) {
        const shake = quakeT > 0 ? Math.sin(ts * 0.09) * 6 * Math.min(1, quakeT) : 0;
        c.save(); c.translate(shake, -shake * 0.6);
        for (let gy = 0; gy < MAP.length; gy++) for (let gx = 0; gx < MAP[0].length; gx++) {
          const ch = MAP[gy][gx], px = gx * T, py = gy * T;
          if (ch === '#') {
            c.fillStyle = '#4a3a2e'; c.fillRect(px, py, T + 1, T + 1);
            c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(px, py + T * 0.7, T + 1, T * 0.3);
          } else if (ch === 'D' && quakeT > 0) {
            c.fillStyle = '#6e552f'; c.fillRect(px, py, T + 1, T + 1);          // barred door (still shut)
            c.fillStyle = '#2a2014'; for (let i = 0; i < 3; i++) c.fillRect(px + 8 + i * 11, py + 4, 4, T - 8);
          } else {
            c.fillStyle = '#8c7a58'; c.fillRect(px, py, T + 1, T + 1);          // floor
          }
        }
        for (const p of pris) {                              // prisoners
          c.beginPath(); c.arc(p.x, p.y, 9, 0, 7);
          c.fillStyle = p.secured ? '#ffd27f' : '#c46a5a'; c.fill();
          if (p.secured) label(c, '✓', p.x, p.y - 14, '#ffd27f');
        }
        c.beginPath(); c.arc(me.x, me.y, 11, 0, 7); c.fillStyle = '#7fc4ff'; c.fill();  // the jailer
        c.lineWidth = 2; c.strokeStyle = '#dff0ff'; c.stroke();
        // darkness with a lantern hole
        const g = c.createRadialGradient(me.x, me.y, 55, me.x, me.y, 195);
        g.addColorStop(0, 'rgba(4,8,16,0)'); g.addColorStop(1, 'rgba(4,8,16,0.93)');
        c.fillStyle = g; c.fillRect(-20, -20, VW + 40, VH + 40);
        if (hint) for (const p of pris) if (!p.secured) {    // hint: prisoners glimmer through the dark
          c.beginPath(); c.arc(p.x, p.y, 9, 0, 7);
          c.strokeStyle = 'rgba(255,150,120,.6)'; c.lineWidth = 2; c.stroke();
        }
        for (const p of pris) if (p.secured) {               // the accounted-for still show
          c.beginPath(); c.arc(p.x, p.y, 4, 0, 7); c.fillStyle = 'rgba(255,210,127,.8)'; c.fill();
        }
        c.restore();
        if (quakeT > 0) label(c, 'THE EARTH SHAKES — THE DOORS BURST OPEN!', VW / 2, VH / 2, '#ffe6a8', 26);
        label(c, `Prisoners ${caught}/8`, 140, 92, '#ffd27f', 17);
        bar(c, VW / 2 - 120, 82, 240, 10, dawn / (hint ? 105 : 80), '#ffb347');
        label(c, 'until dawn', VW / 2, 110, '#e7d8b8');
      },
    };
  },
};

// ----------------------------------------------------------------------------
//  4. Riot Run in Ephesus — outrun the mob to the theatre (Acts 19)
// ----------------------------------------------------------------------------
const riot = {
  id: 'riot', icon: '🏛', title: 'Riot Run in Ephesus',
  tagline: 'The mob surges behind you — dodge the stalls, and shelter in a doorway when the roar rises',
  controls: 'A / D to weave — you run without ceasing',
  hintNote: 'The mob tires — and you hear its surges coming sooner.',
  create(env) {
    const hint = env.fails >= 2;
    const L = 260, R = 700, GOAL = 1500, PY = 430;
    const me = { x: 480, p: 0 };
    let crowd = -260, stumble = 0, surge = 0, warn = 0, nextSurge = rand(6, 9), t = 0;
    const stalls = [], doors = [];
    for (let d = 240; d < GOAL + 200; d += rand(135, 195))
      stalls.push({ p: d, x: rand(L + 60, R - 60), w: rand(70, 110), h: 34, hit: false });
    for (let d = 300, side = 0; d < GOAL + 200; d += rand(290, 360), side ^= 1)
      doors.push({ p: d, x: side ? L - 22 : R + 22, w: 44, h: 76 });
    const inDoor = () => doors.some(o => Math.abs(o.p - me.p) < o.h / 2 && Math.abs(o.x - me.x) < o.w / 2 + 8);
    return {
      update(dt) {
        t += dt;
        const spd = stumble > 0 ? 70 : 235;
        stumble = Math.max(0, stumble - dt);
        me.p += spd * dt;
        if (env.keys['KeyA'] || env.keys['ArrowLeft']) me.x -= 240 * dt;
        if (env.keys['KeyD'] || env.keys['ArrowRight']) me.x += 240 * dt;
        me.x = clamp(me.x, L - 30, R + 30);
        if (me.x > L + 6 && me.x < R - 6)                   // stalls only block the open street
          for (const s of stalls)
            if (!s.hit && Math.abs(s.p - me.p) < s.h / 2 + 8 && Math.abs(s.x - me.x) < s.w / 2 + 9) {
              s.hit = true; stumble = 0.85; env.sfx.impact?.();
            }
        if (warn > 0) { warn -= dt; if (warn <= 0) { surge = 2.4; env.sfx.crowd?.(); } }
        else if (surge > 0) surge -= dt;
        else { nextSurge -= dt; if (nextSurge <= 0) { warn = hint ? 2.4 : 1.4; nextSurge = rand(7.5, 10.5); } }
        const csp = surge > 0 ? (hint ? 295 : 335) : (hint ? 185 : 206);
        crowd += csp * dt;
        if (surge > 0 && inDoor()) crowd = Math.min(crowd, me.p - 42);   // pressed into the doorway, the flood streams past
        if (crowd >= me.p - 10) return env.lose('The mob sweeps you up, roaring “Great is Artemis!”');
        if (me.p >= GOAL) env.win('You reach the theatre and cry your warning — the riot howls behind you.');
      },
      draw(c, ts) {
        const sy = wp => PY - (wp - me.p);                  // world progress → screen y
        c.fillStyle = '#1a2430'; c.fillRect(0, 0, VW, VH);
        c.fillStyle = '#2c3c4e'; c.fillRect(0, 0, L - 10, VH); c.fillRect(R + 10, 0, VW - R - 10, VH); // houses
        c.fillStyle = '#7a6a4a'; c.fillRect(L - 10, 0, R - L + 20, VH);                                // the street
        c.strokeStyle = 'rgba(0,0,0,.2)';
        for (let wp = Math.floor((me.p - 200) / 60) * 60; wp < me.p + 500; wp += 60) {
          c.beginPath(); c.moveTo(L - 10, sy(wp)); c.lineTo(R + 10, sy(wp)); c.stroke();               // paving
        }
        for (const o of doors) {                            // sheltering doorways
          const y = sy(o.p); if (y < -60 || y > VH + 60) continue;
          c.fillStyle = '#151c26'; c.fillRect(o.x - o.w / 2, y - o.h / 2, o.w, o.h);
          c.strokeStyle = '#ffd27f'; c.lineWidth = 2; c.strokeRect(o.x - o.w / 2, y - o.h / 2, o.w, o.h);
          label(c, 'doorway', o.x, y - o.h / 2 - 6, '#ffd27f', 11);
        }
        for (const s of stalls) {                           // market stalls
          const y = sy(s.p); if (y < -50 || y > VH + 50) continue;
          c.fillStyle = s.hit ? '#5a4632' : '#9a6a35'; c.fillRect(s.x - s.w / 2, y - s.h / 2, s.w, s.h);
          c.fillStyle = '#c9b083'; c.fillRect(s.x - s.w / 2, y - s.h / 2, s.w, 7);
        }
        const cy = sy(crowd);                               // the mob — a churning wall
        if (cy > -40) {
          const g = c.createLinearGradient(0, cy, 0, cy + 120);
          g.addColorStop(0, 'rgba(190,70,40,.95)'); g.addColorStop(1, 'rgba(120,30,20,.98)');
          c.fillStyle = g; c.fillRect(0, cy, VW, VH - cy + 40);
          c.fillStyle = 'rgba(255,190,120,.5)';
          for (let x = 20; x < VW; x += 34) { const b = Math.sin(ts * 0.012 + x) * 7; c.beginPath(); c.arc(x, cy + 12 + b, 9, 0, 7); c.fill(); }
        }
        c.beginPath(); c.arc(me.x, PY, 11, 0, 7); c.fillStyle = '#7fc4ff'; c.fill();
        c.lineWidth = 2; c.strokeStyle = '#dff0ff'; c.stroke();
        if (stumble > 0) label(c, 'you stumble!', me.x, PY - 22, '#ffb98a');
        if (warn > 0) label(c, 'THE CROWD SURGES — FIND A DOORWAY!', VW / 2, 130, '#ff9a7a', 26);
        else if (surge > 0 && inDoor()) label(c, 'pressed into the doorway — the flood streams past', VW / 2, 130, '#ffd27f', 18);
        bar(c, VW / 2 - 120, 82, 240, 10, me.p / GOAL, '#7fc4ff');
        label(c, 'to the theatre', VW / 2, 110, '#e7d8b8');
        bar(c, VW - 200, 18, 160, 10, clamp(1 - (me.p - crowd) / 300, 0, 1), '#e06040');
        label(c, 'the roar behind', VW - 120, 46, '#e7b8a8');
      },
    };
  },
};

// ----------------------------------------------------------------------------
//  5. Night Passage of the Cyclades — thread the rocks by lighthouse-light
//     (Acts 20:13–16 — “hastening to be at Jerusalem by Pentecost”)
// ----------------------------------------------------------------------------
const cyclades = {
  id: 'cyclades', icon: '⛵', title: 'Night Passage of the Cyclades',
  tagline: 'Race the calendar to Samos — the rocks show only by lighthouse beam and moonlit foam',
  controls: 'A / D to steer · W press on · S ease off',
  hintNote: 'An old pilot has marked you the safe channel.',
  create(env) {
    const hint = env.fails >= 2;
    const GOAL = 3000, SY = 470;
    const me = { x: 480, p: 0 };
    let timeLeft = hint ? 100 : 82, hull = 0, inv = 0;
    const rows = [], lights = [];
    let gap = 480;
    for (let d = 260; d < GOAL - 150; d += 150) {
      gap = clamp(gap + rand(-170, 170), 210, 750);
      const row = { p: d, gap, rocks: [] };
      for (let i = 0; i < 5; i++) {
        const x = rand(120, 840);
        if (Math.abs(x - gap) > 105) row.rocks.push({ x, r: rand(16, 26) });
      }
      rows.push(row);
    }
    for (let d = 500, side = 0; d < GOAL; d += 650, side ^= 1) lights.push({ p: d, x: side ? 60 : 900, side });
    const beamOn = (rock, rowP, ts) => lights.some(l => {
      if (Math.abs(l.p - rowP) > 420) return false;
      const a = Math.atan2(rowP - l.p, rock.x - l.x);
      const sweep = Math.sin(ts * 0.0006 + l.p) * 0.85;                       // sweeps the sea
      const target = l.side ? sweep : Math.PI - sweep;
      let dd = Math.abs(a - target); if (dd > Math.PI) dd = 2 * Math.PI - dd;
      return dd < 0.22;
    });
    return {
      update(dt) {
        timeLeft -= dt; inv = Math.max(0, inv - dt);
        if (timeLeft <= 0) return env.lose('The days slip away — Pentecost will not wait. Put about and try again.');
        let spd = 215;
        if (env.keys['KeyW'] || env.keys['ArrowUp']) spd = 300;
        if (env.keys['KeyS'] || env.keys['ArrowDown']) spd = 130;
        me.p += spd * dt;
        if (env.keys['KeyA'] || env.keys['ArrowLeft']) me.x -= 230 * dt;
        if (env.keys['KeyD'] || env.keys['ArrowRight']) me.x += 230 * dt;
        me.x = clamp(me.x, 110, 850);
        if (inv <= 0) for (const row of rows) {
          if (Math.abs(row.p - me.p) > 40) continue;
          for (const rock of row.rocks)
            if (dist(rock.x, row.p, me.x, me.p) < rock.r + 13) {
              hull++; inv = 1.6; env.sfx.impact?.();
              if (hull >= 2) return env.lose('The hull splinters on the rocks of the Cyclades.');
            }
        }
        if (me.p >= GOAL) env.win('Samos by dawn — and Jerusalem before Pentecost!');
      },
      draw(c, ts) {
        const sy = wp => SY - (wp - me.p);
        c.fillStyle = '#08131f'; c.fillRect(0, 0, VW, VH);                    // night sea
        c.fillStyle = 'rgba(190,215,235,.10)';
        for (let i = 0; i < 60; i++) {                                        // moving wave stipples
          const wy = ((i * 83 + ts * 0.05) % (VH + 40)) - 20, wx = (i * 157) % VW;
          c.fillRect(wx, wy, 14, 2);
        }
        c.fillStyle = '#e8e3cf'; c.beginPath(); c.arc(870, 60, 22, 0, 7); c.fill();  // moon
        for (const l of lights) {                                             // lighthouses & beams
          const y = sy(l.p); if (y < -520 || y > VH + 520) continue;
          const sweep = Math.sin(ts * 0.0006 + l.p) * 0.85;
          const target = l.side ? sweep : Math.PI - sweep;
          c.fillStyle = 'rgba(255,230,150,.13)';
          c.beginPath(); c.moveTo(l.x, y);
          c.lineTo(l.x + Math.cos(target - 0.16) * 520, y + Math.sin(target - 0.16) * 520);
          c.lineTo(l.x + Math.cos(target + 0.16) * 520, y + Math.sin(target + 0.16) * 520);
          c.closePath(); c.fill();
          c.fillStyle = '#d9c08a'; c.fillRect(l.x - 9, y - 30, 18, 44);
          c.fillStyle = '#ffe08a'; c.fillRect(l.x - 6, y - 40, 12, 12);
        }
        if (hint) {                                                           // the pilot's safe channel
          c.setLineDash([4, 10]); c.strokeStyle = 'rgba(140,255,180,.55)'; c.lineWidth = 3;
          c.beginPath(); let first = true;
          for (const row of rows) {
            const y = sy(row.p); if (y < -60 || y > VH + 60) continue;
            if (first) { c.moveTo(row.gap, y); first = false; } else c.lineTo(row.gap, y);
          }
          c.stroke(); c.setLineDash([]);
        }
        for (const row of rows) {                                             // the rocks
          const y = sy(row.p); if (y < -60 || y > VH + 60) continue;
          for (const rock of row.rocks) {
            const seen = beamOn(rock, row.p, ts) || dist(rock.x, row.p, me.x, me.p) < 150;
            c.beginPath(); c.arc(rock.x, y, rock.r + 6, 0, 7);                // tell-tale foam
            c.strokeStyle = `rgba(200,225,240,${seen ? 0.6 : hint ? 0.4 : 0.13})`; c.lineWidth = 2; c.stroke();
            if (seen) { c.beginPath(); c.arc(rock.x, y, rock.r, 0, 7); c.fillStyle = '#2a3540'; c.fill(); }
          }
        }
        c.save(); c.translate(me.x, SY);                                      // the ship
        if (inv > 0 && Math.floor(ts / 90) % 2) c.globalAlpha = 0.4;
        c.fillStyle = '#8a5a2c'; c.beginPath(); c.moveTo(0, -24); c.lineTo(13, 16); c.lineTo(-13, 16); c.closePath(); c.fill();
        c.fillStyle = '#e8e0c8'; c.beginPath(); c.moveTo(0, -18); c.lineTo(10, 6); c.lineTo(0, 6); c.closePath(); c.fill();
        c.restore();
        bar(c, VW / 2 - 120, 82, 240, 10, me.p / GOAL, '#7fc4ff');
        label(c, 'to Samos', VW / 2, 110, '#e7d8b8');
        bar(c, VW - 200, 18, 160, 10, timeLeft / (hint ? 100 : 82), '#ffb347');
        label(c, 'Pentecost draws near', VW - 120, 46, '#e7d8b8');
        label(c, hull >= 1 ? '⚠ the hull groans — one more strike will end it' : '', VW / 2, VH - 24, '#ffb98a', 15);
      },
    };
  },
};

export const ARCADE_GAMES = [viper, wall, jailer, riot, cyclades];

// ============================================================================
//  Runner — ready / play / lost-retry / won states on a letterboxed canvas
// ============================================================================
let A = null;

export const arcadeRunning = () => !!A;

export function startArcade(id, { canvas, keys, sfx, onExit }) {
  const game = ARCADE_GAMES.find(g => g.id === id);
  if (!game || A) return;
  A = { game, canvas, c: canvas.getContext('2d'), keys, sfx, onExit,
        fails: 0, state: 'ready', stateT: 1.3, inst: null, playT: 0, banner: '', prev: 0 };
  resize();
  addEventListener('resize', resize);
  spawn();
  requestAnimationFrame(loop);
}

export function stopArcade() {
  if (!A) return;
  removeEventListener('resize', resize);
  A = null;
}

function resize() {
  if (!A) return;
  A.canvas.width = window.innerWidth;
  A.canvas.height = window.innerHeight;
}

function spawn() {
  const env = {
    keys: A.keys, sfx: A.sfx, fails: A.fails,
    win(msg) { if (A.state !== 'play') return; A.state = 'won'; A.stateT = 2.4; A.banner = msg; A.sfx.chime?.(); },
    lose(msg) { if (A.state !== 'play') return; A.state = 'lost'; A.stateT = 2.0; A.banner = msg; A.sfx.stab?.(); },
  };
  A.inst = A.game.create(env);
}

function loop(ts) {
  if (!A) return;
  requestAnimationFrame(loop);
  const dt = Math.min(0.045, (ts - A.prev) / 1000 || 0.016); A.prev = ts;

  if (A.state === 'ready') {
    A.stateT -= dt;
    if (A.stateT <= 0) { A.state = 'play'; A.playT = 0; }
  } else if (A.state === 'play') {
    A.playT += dt;
    A.inst.update(dt, ts);
  } else {
    A.stateT -= dt;
    if (A.stateT <= 0) {
      if (A.state === 'won') {
        const status = `✓ ${A.game.icon} ${A.game.title} — completed in ${Math.round(A.playT)}s` +
          (A.fails ? ` (attempt ${A.fails + 1})` : '');
        const exit = A.onExit; stopArcade(); exit(status);
        return;
      }
      A.fails++; A.state = 'ready'; A.stateT = 1.3; spawn();   // instant retry
    }
  }

  // draw, letterboxed to 960×600
  const { c, canvas } = A;
  const scale = Math.min(canvas.width / VW, canvas.height / VH);
  const ox = (canvas.width - VW * scale) / 2, oy = (canvas.height - VH * scale) / 2;
  c.fillStyle = '#04090f'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.translate(ox, oy); c.scale(scale, scale);
  c.beginPath(); c.rect(0, 0, VW, VH); c.clip();
  A.inst.draw(c, ts);
  if (A.state === 'ready') {
    c.fillStyle = 'rgba(4,9,15,.62)'; c.fillRect(0, 0, VW, VH);
    label(c, A.fails ? `Attempt ${A.fails + 1}` : 'Ready…', VW / 2, VH / 2 - 40, '#ffd27f', 34);
    label(c, A.game.controls, VW / 2, VH / 2 + 6, '#e7d8b8', 18);
    if (A.fails >= 2 && A.game.hintNote) label(c, `✦ ${A.game.hintNote}`, VW / 2, VH / 2 + 44, '#9fe0b0', 16);
  } else if (A.state === 'won' || A.state === 'lost') {
    c.fillStyle = A.state === 'won' ? 'rgba(40,60,30,.55)' : 'rgba(60,20,15,.55)';
    c.fillRect(0, 0, VW, VH);
    label(c, A.banner, VW / 2, VH / 2 - 8, A.state === 'won' ? '#ffe6a8' : '#ffb0a0', 24);
    if (A.state === 'lost') label(c, 'again — from the start', VW / 2, VH / 2 + 32, '#e7d8b8', 16);
  }
  c.restore();
}
