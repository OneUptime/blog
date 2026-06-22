# Validation Summary: How to Fix 'Event Loop Blocking' Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- JavaScript
- Node.js event loop
- `perf_hooks.monitorEventLoopDelay`
- `worker_threads`
- Node.js streams
- JSONStream

## Sources Consulted
- Node.js Learn: The Node.js Event Loop - https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick
- Node.js API: Performance measurement APIs (`perf_hooks.monitorEventLoopDelay`) - https://nodejs.org/api/perf_hooks.html
- Node.js API: Worker threads - https://nodejs.org/api/worker_threads.html
- Node.js API: Streams and `stream/promises.pipeline` - https://nodejs.org/api/stream.html
- Node.js API: File system streams (`fs.createReadStream`, `fs.createWriteStream`) - https://nodejs.org/api/fs.html
- Node.js API: Timers (`setImmediate`) - https://nodejs.org/api/timers.html
- JSONStream package documentation - https://www.npmjs.com/package/JSONStream

## Issues Found
- The streaming JSON example used `createWriteStream(outputPath)` without importing `createWriteStream` from `fs`. I updated the import to `const { createReadStream, createWriteStream } = require('fs');` so the example can run.
- The blocked detection example said capturing `new Error().stack` requires `--enable-source-maps`. That is misleading: an error stack is available without that flag, and the stack captured in this callback shows where the delayed check ran rather than the original blocking call site. I updated the comment to clarify that a profiler is needed to find the blocking call site.

## Review Notes
The examples use CommonJS imports without the `node:` prefix. This remains valid in current Node.js, though `node:`-prefixed built-in imports are often preferred in newer examples. The worker pool example is educational and demonstrates the core pattern, but production worker pools should also handle worker exits, idle-worker errors, backpressure, and queue shutdown behavior more comprehensively.
