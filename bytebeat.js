#!/usr/bin/env node
import { readFileSync, watchFile } from "fs";
import { Script, createContext } from "vm";
import Speaker from "speaker";

// Parse arguments
const file = process.argv[2];
const virtualRate = parseInt(process.argv[3] || "8000", 10); // Virtual rate for bytebeat formula
const outputRate = 44100; // Fixed output rate for fast Windows buffer drain

if (!file) {
  console.error("Usage: bytebeat <formula.js> [rate]");
  console.error("");
  console.error("Arguments:");
  console.error("  formula.js - Path to your bytebeat formula");
  console.error("  rate       - Virtual sample rate for formula (default: 8000)");
  console.error("               Lower = classic bytebeat sound, Higher = cleaner sound");
  console.error("");
  console.error("Examples:");
  console.error("  node bytebeat.js formula.js              # 8kHz classic bytebeat");
  console.error("  node bytebeat.js formula.js 44100        # High quality");
  console.error("");
  console.error("Note: Audio always outputs at 44100 Hz for low latency (~1s reload)");
  process.exit(1);
}

// Fixed 44100 Hz output for fast buffer drain = lower reload latency
const speaker = new Speaker({
  channels: 1,
  sampleRate: outputRate,
  bitDepth: 16,
  signed: true,
  highWaterMark: 1024
});

speaker.on("error", (err) => {
  console.error("[speaker error]", err.message);
  process.exit(1);
});

console.log(`[init] virtual rate: ${virtualRate} Hz, output: ${outputRate} Hz`);

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
    t = 0;
    console.log(`[reloaded] ${new Date().toLocaleTimeString()}`);
    
  } catch (err) {
    console.error("[compile error]", err.message);
  }
}

// Use watchFile for stable behavior on Windows
watchFile(file, { interval: 200 }, compileFormula);
compileFormula();

// Sample rate conversion: virtual rate -> 44100 Hz output
const BUFFER_SIZE = 512; // Output buffer size (at 44100 Hz)
const BYTES_PER_BUFFER = BUFFER_SIZE * 2;
const TARGET_QUEUED_BYTES = BYTES_PER_BUFFER * 1;
const sampleRatio = virtualRate / outputRate; // How many virtual samples per output sample

function fillBuffer(gen) {
  // Stop if this loop is stale
  if (gen !== generation) return;
  
  if (!currentScript) {
    return setTimeout(() => fillBuffer(gen), 10);
  }

  // Generate output buffer with sample rate conversion
  while (speaker.writableLength < TARGET_QUEUED_BYTES) {
    const buffer = Buffer.allocUnsafe(BYTES_PER_BUFFER);
    
    for (let i = 0; i < BUFFER_SIZE; i++) {
      // Calculate which virtual sample this output sample corresponds to
      const virtualSampleIndex = Math.floor(t * sampleRatio);
      context.t = virtualSampleIndex;
      
      try {
        const u = currentScript.runInContext(context) & 255;
        const s = ((u - 128) << 8);
        buffer.writeInt16LE(s, i * 2);
      } catch {
        buffer.writeInt16LE(0, i * 2);
      }
      
      t++; // Increment output sample counter
    }

    if (!speaker.write(buffer)) {
      return speaker.once("drain", () => fillBuffer(gen));
    }
  }
  
  setImmediate(() => fillBuffer(gen));
}

// Start the render loop
fillBuffer(generation);
