# Validation Summary: How to Debug Node.js Applications with Chrome DevTools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Chrome DevTools
- JavaScript debugging
- VS Code Node.js debugging
- Express
- V8 CPU profiling
- Heap snapshots and allocation profiling
- Docker Compose
- Jest
- Mocha
- TypeScript source maps

## Sources Consulted
- Node.js debugging guide: https://nodejs.org/learn/getting-started/debugging
- Node.js CLI help output for `--inspect`, `--inspect-brk`, `--prof`, and `--prof-process`
- Node.js profiling guide: https://nodejs.org/learn/getting-started/profiling
- Chrome DevTools Node.js performance profiling docs: https://developer.chrome.com/docs/devtools/performance/nodejs
- Chrome DevTools JavaScript breakpoints docs: https://developer.chrome.com/docs/devtools/javascript/breakpoints
- Chrome DevTools Memory panel docs: https://developer.chrome.com/docs/devtools/memory
- Chrome DevTools heap snapshots docs: https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots
- Chrome DevTools Console Utilities API reference: https://developer.chrome.com/docs/devtools/console/utilities
- Chrome DevTools source maps docs: https://developer.chrome.com/docs/devtools/javascript/source-maps
- VS Code Node.js debugging docs: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
- Jest troubleshooting docs: https://jestjs.io/docs/troubleshooting
- Mocha command-line usage docs: https://mochajs.org/running/cli/
- TypeScript `sourceMap` TSConfig reference: https://www.typescriptlang.org/tsconfig/sourceMap.html

## Issues Found
- The VS Code `launch.json` example used a `json` code fence while including a comment. Changed the fence to `jsonc`, matching VS Code's JSON-with-comments configuration format.
- The `v8-profiler-next` example used top-level `await` in a CommonJS-style snippet and omitted the `fs` import used by `fs.writeFileSync`. Wrapped the profiling flow in an async function and added `const fs = require('fs');`.
- The remote debugging example bound the inspector to `0.0.0.0` while also recommending SSH tunneling. Changed it to bind to `127.0.0.1:9229`, which matches the SSH tunnel workflow and avoids exposing the inspector externally.
- The `package.json` and `tsconfig.json` snippets included JavaScript comments inside `json` fences. Removed the comments so the snippets are valid JSON.
- The "Breaking on Property Access" section used `debug(myObject.propertyName)`, but Chrome DevTools' `debug()` console utility expects a function and pauses when that function is called. Changed the section to "Breaking on Function Calls" and updated the example to `debug(processUser)`.

## Review Notes
- The Docker example still binds the inspector to `0.0.0.0:9229`, which is appropriate inside a container when the debug port must be reachable from the host. In production or shared environments, the exposed port should be firewall-protected or tunneled.
- The DevTools UI can vary slightly by Chrome version, but the documented workflows for `chrome://inspect`, breakpoints, heap snapshots, source maps, and CPU profiling remain technically valid.
