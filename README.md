# bytebeat-nodejs

A **minimal Node.js Bytebeat player** for livecoding generative music.

It evaluates a tiny JavaScript expression for each audio sample, producing 8-bit chiptune-style sounds in real time.  
Supports **live code reload** — edit your formula file and the sound updates instantly.

---

## Features

- **Virtual sample rate** with automatic resampling to 44100 Hz
  - Bytebeat formula runs at your chosen rate (8000 Hz default for classic sound)
  - Output always at 44100 Hz for fast OS buffer drain
  - **Result: ~1 second reload latency** instead of 5+ seconds
- **Live code hot-swapping** without clicks or gaps
- **Enhanced VM context** with Math functions (`sin`, `cos`, `abs`, `random`, etc.)
- **Configurable buffering** to balance stability vs latency
- Professional CLI with [`commander`](https://github.com/tj/commander.js)
- Clean, hackable core (~90 lines of code)

---

## Installation

**Prerequisites:**
- Node.js v12.20+ (for ES modules support)

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
node bytebeat.js <formula> [options]
```

**Arguments:**
- `<formula>` - Path to your bytebeat formula file (required)

**Options:**
- `-r, --rate <hz>` - Virtual sample rate in Hz (default: 8000)
  - Lower = classic crunchy bytebeat sound
  - Higher = cleaner, smoother sound  
  - Output is always 44100 Hz regardless
- `-b, --buffers <n>` - Number of buffers to queue (default: 2)
  - Higher = more stable playback, slightly more latency
  - Lower = less latency, may underrun on complex formulas
  - Range: 1-8 buffers
- `-h, --help` - Display help
- `-V, --version` - Display version

**Examples:**

```bash
# Basic usage (8kHz, 2 buffers)
node bytebeat.js examples/42-melody.js

# High-quality sound
node bytebeat.js examples/steady-on-tim.js --rate 44000

# Stable playback for complex formulas
node bytebeat.js examples/steady-on-tim.js -r 44000 -b 4

# Minimum latency
node bytebeat.js examples/42-melody.js --buffers 1

# Show help
node bytebeat.js --help
```

**Formula files** should contain a single JavaScript expression using:
- `t` - Sample counter (increments at virtual rate)
- Math functions: `sin`, `cos`, `abs`, `random`, `floor`, etc.
- Standard operators: `&`, `|`, `^`, `<<`, `>>`, etc.

The output is automatically resampled to 44100 Hz for playback.

Example formulas are in the `examples` directory.

---

## Live Reload

The player watches your formula file and automatically reloads when you save changes.

**Reload Latency:**
- **~1 second** - Thanks to 44100 Hz output draining OS buffers 5.5x faster than 8kHz
- Changes are audible quickly while maintaining classic bytebeat sound
- Much better than the 5+ seconds with direct low sample rate output

**How it works:**
- File watching via `fs.watchFile` (stable on all platforms)
- Hot-swaps compiled formula without restarting audio
- Time counter continues incrementing for smooth transitions
- Single persistent render loop - no overlapping audio

---

## Virtual Sample Rate

This player uses a **virtual sample rate system** to solve Windows audio buffering latency:

**The Problem:**
- Windows audio buffers 3-10 seconds of audio internally
- At 8kHz, 10s of buffer = 80,000 samples to drain
- Reload latency = buffer drain time (very slow)

**The Solution:**
- Formula runs at your chosen virtual rate (8kHz for classic sound)
- Output is resampled to 44100 Hz in real-time
- Same 10s Windows buffer = only ~1.8 seconds to drain
- **Result: 5.5x faster reload** with identical sound quality

**Technical Details:**
- Nearest-neighbor resampling (`virtualSampleIndex = floor(outputSample * ratio)`)
- Formula evaluated at virtual rate, output generated at 44100 Hz
- No noticeable aliasing for typical bytebeat formulas
- CPU efficient - single context, no per-sample overhead

---
