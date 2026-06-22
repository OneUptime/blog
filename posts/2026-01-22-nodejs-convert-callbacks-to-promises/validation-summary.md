# Validation Summary: How to Convert Callback Functions to Promises in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- JavaScript Promises
- async/await
- Error-first callbacks
- util.promisify
- fs promises API
- dns promises API
- timers/promises
- EventEmitter and events.once
- Node.js readable streams

## Sources Consulted
- Node.js util documentation: https://nodejs.org/api/util.html
- Node.js file system documentation: https://nodejs.org/api/fs.html
- Node.js DNS documentation: https://nodejs.org/api/dns.html
- Node.js timers documentation: https://nodejs.org/api/timers.html
- Node.js events documentation: https://nodejs.org/api/events.html
- Node.js stream documentation: https://nodejs.org/api/stream.html

## Issues Found
- The `fs.promises` version comment said "Node.js 10+" while the `require('fs').promises` access pattern is documented from Node.js 10.1.0. Updated the comment to "Node.js 10.1+".
- The `events.once` heading said "Node.js 11.13+" only. Official documentation also lists Node.js 10.16.0, so the heading now says "Node.js 10.16+ or 11.13+".
- The `events.once` stream example waited for `end` without consuming the readable stream. Node.js readable streams only emit `end` after data is consumed, so the example now calls `stream.resume()` before waiting for `end`.
- The legacy database example promisified `query(sql, params, callback)` but called it as `query(sql)`, which caused the promisified callback to be passed as `params` and left `callback` undefined. Updated the `BEGIN`, `COMMIT`, `ROLLBACK`, and example `SELECT` calls to pass an empty params array.

## Review Notes
The examples use CommonJS `require()` consistently and avoid deprecated APIs. Node.js documentation notes that calling `util.promisify()` on functions that already return Promises is deprecated as of Node.js 20.8.0; this post correctly recommends built-in Promise APIs where available.
