# bytebeat-nodejs

A **minimal Node.js Bytebeat player** for livecoding generative music.

It evaluates a tiny JavaScript expression for each audio sample, producing 8-bit chiptune-style sounds in real time.  
Supports **live code reload** — edit your formula file and the sound updates instantly.

---

## Features

- Real-time bytebeat playback using the [`speaker`](https://www.npmjs.com/package/speaker) module  
- Live reload when the formula file changes  
- Lightweight — zero extra dependencies  
- Simple and hackable core (~90 lines of code)

---

## Installation

Clone and install dependencies:

```bash
git clone https://github.com/pckerneis/bytebeat-nodejs.git
cd bytebeat-nodejs
npm install
```

Make the CLI executable:

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
bytebeat <formula.js> [rate]
```

Example:

```bash
bytebeat formula.js 8000
```

Your formula file should contain a single JavaScript expression that uses the variable `t` (the sample counter).

You'll find example formula files in the `examples` directory.
