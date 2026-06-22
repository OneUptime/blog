# Validation Summary: How to Fix 'Error: ENOMEM: not enough memory' in Node.js

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Node.js
- V8 heap and garbage collection flags
- Node.js streams and readline
- Node.js process memory metrics
- lru-cache
- Docker
- PM2
- Chrome DevTools / Node.js inspector

## Sources Consulted
- Node.js CLI documentation: https://nodejs.org/api/cli.html
- Node.js memory diagnostics guide: https://nodejs.org/learn/diagnostics/memory/understanding-and-tuning-memory
- Node.js V8 module documentation: https://nodejs.org/api/v8.html
- Node.js readline documentation: https://nodejs.org/api/readline.html
- Node.js stream documentation: https://nodejs.org/api/stream.html
- Node.js events documentation: https://nodejs.org/api/events.html
- PM2 memory limit reload documentation: https://pm2.keymetrics.io/docs/usage/memory-limit/
- PM2 ecosystem file reference: https://pm2.io/docs/runtime/reference/ecosystem-file/
- lru-cache README / npm package metadata: https://www.npmjs.com/package/lru-cache

## Issues Found
- The `lru-cache` example used the older `const LRU = require('lru-cache')` constructor style. Updated it to the current documented CommonJS API, `const { LRUCache } = require('lru-cache')`, and instantiated `new LRUCache(...)`.
- The `lru-cache` `sizeCalculation` used `JSON.stringify(value).length`, which counts UTF-16 code units rather than bytes. Updated it to `Buffer.byteLength(JSON.stringify(value))` so the configured `maxSize` is measured in byte-like units.
- The JSONL stream example assumed each Transform chunk contained exactly one complete line. Node.js stream chunks do not guarantee record boundaries, so the example could fail on partial or multiple JSONL records. Replaced it with `readline.createInterface()` over an `fs.ReadStream` and added write-stream backpressure handling with `events.once(outputStream, 'drain')`.
- The JSONL writer ended the output stream without waiting for the buffered data to flush. Added `await once(outputStream, 'finish')` after `outputStream.end()`.
- The heap snapshot example treated `v8.writeHeapSnapshot()` as though it returned a stream. Node.js documents that it writes a snapshot file and returns the filename. Renamed the variables and used the returned filename correctly.
- Two snippets used `v8.getHeapStatistics()` without importing the `v8` module in the shown code block. Added `const v8 = require('v8');` to those snippets.

## Review Notes
The edited JavaScript snippets were syntax-checked with Node.js v22.22.0 where practical. The `lru-cache` package is not installed in this repository, so that example was verified against the current package README and npm metadata rather than executed locally.
