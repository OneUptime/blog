# Validation Summary: How to Use Compression in Express.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express.js
- Express compression middleware
- Brotli, gzip, and deflate compression
- shrink-ray-current
- Express static file serving
- HTTP caching headers

## Sources Consulted
- Express compression middleware documentation: https://expressjs.com/en/resources/middleware/compression/
- Express 5 request API documentation for `req.acceptsEncodings()`: https://expressjs.com/en/5x/api/request/
- Express 5 response API documentation for response methods such as `res.sendFile()`, `res.set()`, `res.type()`, and related response handling: https://expressjs.com/en/5x/api/response/
- Express serve-static middleware documentation: https://expressjs.com/en/resources/middleware/serve-static/
- Node.js zlib documentation for gzip, deflate, Brotli, streams, and Brotli parameters: https://nodejs.org/api/zlib.html
- shrink-ray-current README/API documentation: https://github.com/Alorel/shrink-ray

## Issues Found
- The pre-compressed static file example built file paths with `path.join(staticPath, req.path)`, which could resolve outside the intended static directory for path traversal inputs. Added a `safeJoin()` helper using `path.resolve()` and a base-directory check before serving `.br` or `.gz` files.
- The streaming download example built file paths directly from `req.params.file`, which could also resolve outside the intended downloads directory. Changed it to resolve paths under a fixed `filesRoot` and return `403` when the resolved path escapes that root.
- The monitoring example returned `compressionRatio` for the fraction of requests that were compressed, not a byte compression ratio. Renamed the field to `compressedRequestRatio` to match what the code actually measures.

## Review Notes
- The `compression` middleware currently supports `deflate`, `gzip`, and `br` in the documented v1.8.1 release, with Brotli support dependent on Node.js versions that include Brotli support.
- The JavaScript snippets were checked for syntax validity after edits.
