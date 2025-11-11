#!/usr/bin/env node
import { readFileSync, watchFile } from "fs";
import { Script, createContext } from "vm";
import Speaker from "speaker";

// Parse arguments
const file = process.argv[2];
const virtualRate = parseInt(process.argv[3] || "8000", 10);
const outputRate = 44100;

if (!file) {
  console.error("Usage: bytebeat <formula.js> [rate]");
  console.error("");
  console.error("Arguments:");
  console.error("  formula.js - Path to your bytebeat formula");
  console.error("  rate       - Virtual sample rate for formula (default: 8000)");
  console.error("");
  console.error("Examples: node bytebeat.js examples\\steady-on-tim.js 44000");
  process.exit(1);
}

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

const context = createContext({
  t: 0,
  Math,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sqrt: Math.sqrt,
  random: Math.random,
  PI: Math.PI,
  E: Math.E
});

let t = 0;
let errorCount = 0;
const MAX_ERRORS_SHOWN = 5;
let generation = 0;
let lastCode = null;

function compileFormula() {
  try {
    const code = readFileSync(file, "utf8").trim();
    if (!code || code === lastCode) return;
    
    const newScript = new Script(`(${code}) & 255`);
    lastCode = code;
    
    currentScript = newScript;
    t = 0;
    errorCount = 0;
    console.log(`[reloaded] ${new Date().toLocaleTimeString()}`);
    
  } catch (err) {
    console.error("[compile error]", err.message);
  }
}

watchFile(file, { interval: 200 }, compileFormula);
compileFormula();

const BUFFER_SIZE = 512;
const BYTES_PER_BUFFER = BUFFER_SIZE * 2;
const TARGET_QUEUED_BYTES = BYTES_PER_BUFFER * 1;
const sampleRatio = virtualRate / outputRate;

function fillBuffer(gen) {
  if (gen !== generation) return;
  
  if (!currentScript) {
    return setTimeout(() => fillBuffer(gen), 10);
  }

  while (speaker.writableLength < TARGET_QUEUED_BYTES) {
    const buffer = Buffer.allocUnsafe(BYTES_PER_BUFFER);
    
    for (let i = 0; i < BUFFER_SIZE; i++) {
      const virtualSampleIndex = Math.floor(t * sampleRatio);
      context.t = virtualSampleIndex;
      
      try {
        const u = currentScript.runInContext(context) & 255;
        const s = ((u - 128) << 8);
        buffer.writeInt16LE(s, i * 2);
      } catch (e) {
        if (errorCount < MAX_ERRORS_SHOWN) {
          console.error(`[runtime error @ t=${virtualSampleIndex}]`, e.message);
          errorCount++;
          if (errorCount === MAX_ERRORS_SHOWN) {
            console.error("[runtime error] (suppressing further errors...)");
          }
        }
        buffer.writeInt16LE(0, i * 2);
      }
      
      t++;
    }

    if (!speaker.write(buffer)) {
      return speaker.once("drain", () => fillBuffer(gen));
    }
  }
  
  setImmediate(() => fillBuffer(gen));
}

fillBuffer(generation);
