#!/usr/bin/env node
import { readFileSync, watch } from "fs";
import { Script, createContext } from "vm";
import Speaker from "speaker";

// --- CLI args ---
const file = process.argv[2];
const rate = parseInt(process.argv[3] || "8000", 10);

if (!file) {
  console.error("Usage: bytebeat <formula.js> [rate]");
  process.exit(1);
}

// --- Globals ---
let currentScript = null;
let context = { t: 0, Math };

// --- Helper to create a new speaker instance ---
function createSpeaker() {
  return new Speaker({
    channels: 1,
    sampleRate: rate,
    bitDepth: 16,
    signed: true
  });
}

let speaker = createSpeaker();

// --- Compile formula ---
function compileFormula() {
  try {
    const code = readFileSync(file, "utf8").trim();
    if (!code) throw new Error("Empty formula");
    currentScript = new Script(`(${code}) & 255`);
    console.log(`[reloaded] ${new Date().toLocaleTimeString()}`);

    // Reset playback immediately (flush queued audio)
    speaker.end();
    speaker = createSpeaker();
  } catch (err) {
    console.error("[compile error]", err.message);
  }
}

// --- Watch for changes instantly ---
watch(file, { persistent: true }, compileFormula);
compileFormula();

// --- Playback loop ---
const BUFFER_SIZE = 1024;
const buffer = Buffer.alloc(BUFFER_SIZE * 2);
let t = 0;

function fillBuffer() {
  if (!currentScript) return setTimeout(fillBuffer, 100);

  for (let i = 0; i < BUFFER_SIZE; i++) {
    context.t = t++;
    try {
      const u = currentScript.runInNewContext(context) & 255;
      const s = ((u - 128) << 8);
      buffer.writeInt16LE(s, i * 2);
    } catch {
      const u = 128;
      const s = ((u - 128) << 8); // silence on error
      buffer.writeInt16LE(s, i * 2);
    }
  }

  const ok = speaker.write(buffer);
  if (ok) setImmediate(fillBuffer);
  else speaker.once("drain", fillBuffer);
}

fillBuffer();
