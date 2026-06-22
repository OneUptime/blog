# Validation Summary: How to Watch File Changes in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js `fs.watch`
- Node.js `fs.watchFile`
- Chokidar
- CommonJS modules
- WebSocket live reload
- File watching in tests

## Sources Consulted
- Node.js File System API documentation: https://nodejs.org/api/fs.html
- Chokidar official README: https://github.com/paulmillr/chokidar
- npm package installation behavior for Chokidar, as documented by the Chokidar README: https://github.com/paulmillr/chokidar

## Issues Found
- The `fs.watch` recursive option comment said it was limited to macOS/Windows. Updated it to say recursive watching works on supported platforms, because Node.js added recursive support for Linux, AIX, and IBMi in v19.1.0.
- The limitations list said recursive watching is not supported on Linux. Updated it to say support depends on Node.js version and platform.
- The `fs.watchFile` example compared `Date` object references with `curr.mtime !== prev.mtime`. Changed it to compare `curr.mtimeMs !== prev.mtimeMs`, which correctly compares timestamp values.
- The post installed unversioned Chokidar while using CommonJS `require()` and glob patterns. Current Chokidar v5 is ESM-only, and Chokidar v4+ removed glob support. Pinned the install command to `chokidar@3` and added a short note explaining the version constraint.
- The Chokidar close example did not reflect that `.close()` is asynchronous. Updated the commented close call to `await watcher.close()`.
- The hot reload shutdown handler used watcher cleanup without awaiting it. Updated the signal handler to be `async` and await `watcher.close()`.
- The configuration watcher used top-level `await` in a CommonJS-style snippet. Wrapped it in an async IIFE.
- The test example used `fs.writeFileSync` without importing `fs`. Added the missing import.
- The summary table described `fs.watchFile()` as reliable and working everywhere. Changed it to a polling-based fallback, matching the Node.js documentation's caveats.

## Review Notes
The post is technically valid after the fixes. Future updates could migrate the Chokidar examples to current Chokidar v5 by using ESM imports and replacing glob patterns with directory watching plus filtering.
