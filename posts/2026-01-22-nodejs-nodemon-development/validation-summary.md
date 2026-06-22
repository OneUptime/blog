# Validation Summary: How to Use Nodemon for Development in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Nodemon
- npm scripts
- nodemon.json configuration
- TypeScript runtimes and loaders
- Node inspector debugging
- VS Code Node.js debugging
- dotenv

## Sources Consulted
- Nodemon official README: https://github.com/remy/nodemon
- Node.js CLI documentation: https://nodejs.org/api/cli.html
- Visual Studio Code Node.js debugging documentation: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
- Local CLI verification with Node.js v22.22.0 and Nodemon v3.1.14 help/dump output

## Issues Found
- The graceful shutdown example used `process.once('SIGUSR2')` and then sent `SIGUSR2` to itself after cleanup. Nodemon's current documented shutdown pattern handles `SIGUSR2` with `process.on` and sends `SIGTERM` after cleanup so Nodemon can continue its restart flow. Updated the handler accordingly.
- The complete configuration example set `"exec": "node"` without an entry file, which would not start the example server as a standalone Nodemon config. Updated it to `"exec": "node src/server.js"`.
- The `node --watch-path` example and comparison table did not mention that `--watch-path` is only supported on macOS and Windows in the official Node.js CLI documentation. Added that platform caveat.
- The best-practice summary described graceful shutdown as only handling `SIGUSR2`; updated it to clarify that the app should exit after cleanup.

## Review Notes
- Node.js watch mode was introduced before Node 18 in some release lines and became stable in Node 20.13.0 and Node 22.0.0; the post's "Node.js 18+" wording is acceptable as a practical availability note, but future revisions could mention stability by version.
- The environment-variable script examples use Unix shell syntax (`NODE_ENV=development ...`), which is valid on macOS/Linux. A future cross-platform guide could mention Windows-compatible alternatives.
