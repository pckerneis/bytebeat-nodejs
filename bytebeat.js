#!/usr/bin/env node
import { readFileSync, watchFile } from "fs";
import { Script, createContext } from "vm";
import Speaker from "speaker";

const file = process.argv[2];
const rate = parseInt(process.argv[3] || "8000", 10);

if (!file) {
  console.error("Usage: bytebeat <formula.js> [rate]");
  process.exit(1);
}

// Single persistent speaker instance
const speaker = new Speaker({
  channels: 1,
  sampleRate: rate,
  bitDepth: 16,
  signed: true,
  highWaterMark: 8192
});

speaker.on("error", (err) => {
  console.error("[speaker error]", err.message);
  process.exit(1);
});

// Audio state
let currentScript = null;
const context = createContext({ t: 0, Math });
let t = 0;

// Generation counter to stop stale render loops
let generation = 0;

// Compile and hot-swap formula
let lastCode = null;

function compileFormula() {
  try {
    const code = readFileSync(file, "utf8").trim();
    if (!code || code === lastCode) return;
    
    const newScript = new Script(`(${code}) & 255`);
    lastCode = code;
    currentScript = newScript;
    console.log(`[reloaded] ${new Date().toLocaleTimeString()}`);
    // Note: t continues incrementing for smooth playback
    // To reset time on reload, uncomment: t = 0;
  } catch (err) {
    console.error("[compile error]", err.message);
  }
}

// Use watchFile for stable behavior on Windows
watchFile(file, { interval: 200 }, compileFormula);
compileFormula();

// Single persistent render loop
const BUFFER_SIZE = 2048;
const BYTES_PER_BUFFER = BUFFER_SIZE * 2;
const TARGET_QUEUED_BYTES = BYTES_PER_BUFFER * 4; // Keep ~4 buffers queued for smooth timing

function fillBuffer(gen) {
  // Stop if this loop is stale
  if (gen !== generation) return;
  
  if (!currentScript) {
    return setTimeout(() => fillBuffer(gen), 100);
  }

  // Keep the speaker buffer consistently filled for smooth timing
  while (speaker.writableLength < TARGET_QUEUED_BYTES) {
    const buffer = Buffer.allocUnsafe(BYTES_PER_BUFFER);
    
    for (let i = 0; i < BUFFER_SIZE; i++) {
      context.t = t++;
      try {
        const u = currentScript.runInContext(context) & 255;
        const s = ((u - 128) << 8);
        buffer.writeInt16LE(s, i * 2);
      } catch {
        buffer.writeInt16LE(0, i * 2); // silence on error
      }
    }

    if (!speaker.write(buffer)) {
      // Hit backpressure, wait for drain
      return speaker.once("drain", () => fillBuffer(gen));
    }
  }

  // Schedule next top-up
  setImmediate(() => fillBuffer(gen));
}

// Start the single render loop
fillBuffer(generation);
