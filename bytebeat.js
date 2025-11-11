#!/usr/bin/env node
import { readFileSync, watchFile } from "fs";
import { Script } from "vm";
import Speaker from "speaker";

const file = process.argv[2];
const rate = parseInt(process.argv[3] || "8000", 10);

if (!file) {
  console.error("Usage: bytebeat <formula.js> [rate]");
  console.error("Example: bytebeat formula.js 8000");
  process.exit(1);
}

let currentScript = null;
let context = { t: 0, Math };

function compileFormula() {
  try {
    const code = readFileSync(file, "utf8").trim();
    if (!code) throw new Error("Empty formula");
    currentScript = new Script(`(${code}) & 255`);
    console.log(`[reloaded] ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error("[compile error]", err.message);
  }
}

watchFile(file, { interval: 500 }, compileFormula);
compileFormula();

const speaker = new Speaker({
  channels: 1,
  bitDepth: 8,
  sampleRate: rate,
  signed: false
});

const BUFFER_SIZE = 4096;
const buffer = Buffer.alloc(BUFFER_SIZE);
let t = 0;

function fillBuffer() {
  if (!currentScript) return setTimeout(fillBuffer, 100);
  for (let i = 0; i < BUFFER_SIZE; i++) {
    context.t = t++;
    try {
      buffer[i] = currentScript.runInNewContext(context) & 255;
    } catch {
      buffer[i] = 128; // silence on error
    }
  }
  const ok = speaker.write(buffer);
  if (ok) setImmediate(fillBuffer);
  else speaker.once("drain", fillBuffer);
}

fillBuffer();
