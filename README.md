# bytebeat-nodejs

A **minimal Node.js Bytebeat player** for livecoding generative music.

It evaluates a tiny JavaScript expression for each audio sample, producing 8-bit chiptune-style sounds in real time.  
Supports **live code reload** — edit your formula file and the sound updates instantly.

---

## Features

- Real-time bytebeat playback using [`speaker`](https://www.npmjs.com/package/speaker)
- **Virtual sample rate** with automatic resampling to 44100 Hz
  - Bytebeat formula runs at your chosen rate (8000 Hz classic sound, etc.)
  - Output is always 44100 Hz for fast OS buffer drain
  - **Result: ~1 second reload latency** instead of 5+ seconds
- Live code hot-swapping without clicks or gaps
- Simple and hackable core (~120 lines of code)

---

## Installation

**Prerequisites:**
- Node.js (v14+)

Clone and install dependencies:

```bash
git clone https://github.com/pckerneis/bytebeat-nodejs.git
cd bytebeat-nodejs
npm install
```

Make the CLI executable (Linux/Mac):

```bash
chmod +x bytebeat.js
```

Optionally link it globally:

```bash
npm link
```

Now you can run it anywhere as `bytebeat`.

---

## Usage

```bash
node bytebeat.js <formula.js> [rate]
```

**Arguments:**
- `formula.js` - Path to your bytebeat formula file (required)
- `rate` - Virtual sample rate for formula in Hz (default: 8000)
  - Lower rates = classic crunchy bytebeat sound
  - Higher rates = cleaner, smoother sound
  - Audio output is always 44100 Hz regardless of this setting

**Examples:**

```bash
# Classic 8kHz bytebeat sound (default)
node bytebeat.js examples/42-melody.js

# Smoother 44.1kHz sound
node bytebeat.js examples/42-melody.js 44100

# Try different rates
node bytebeat.js examples/steady-on-tim.js 11025
```

**Your formula file** should contain a single JavaScript expression that uses the variable `t` (the sample counter).

The `t` counter increments at your chosen virtual rate, then the output is automatically resampled to 44100 Hz for playback.

You'll find example formula files in the `examples` directory.

---

## Live Reload

The player watches your formula file and automatically reloads when you save changes.

**Reload Latency:**
- **Typical:** ~1 second (thanks to 44100 Hz output draining Windows buffers 5.5x faster than 8kHz)
- Much better than the 5+ seconds with direct 8kHz output
- Changes are audible quickly while maintaining classic bytebeat sound

**How it works:**
- Uses `fs.watchFile` to detect changes (stable on all platforms)
- Hot-swaps the compiled formula without restarting audio
- Time counter resets to 0 on reload for clean transitions
- Sample rate conversion happens in real-time: virtual rate → 44100 Hz output
- Single persistent render loop for smooth, glitch-free playback

---
