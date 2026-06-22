# Validation Summary: How to Use Morgan for HTTP Logging in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Morgan
- HTTP request logging
- Node.js file streams
- rotating-file-stream
- Winston

## Sources Consulted
- Morgan middleware documentation, Express.js: https://expressjs.com/en/resources/middleware/morgan/
- rotating-file-stream README / npm documentation: https://www.npmjs.com/package/rotating-file-stream
- Winston documentation: https://github.com/winstonjs/winston
- Node.js File System documentation: https://nodejs.org/api/fs.html

## Issues Found
- The sample Morgan output showed a `content-length` value of `23` for `res.json({ message: 'Hello!' })`. The JSON response body is 20 bytes, so the output examples were updated to show `20`.
- Several file logging examples opened files under a `logs` directory without first ensuring that directory exists. `fs.createWriteStream()` does not create missing parent directories, so the examples were updated to call `fs.mkdirSync(..., { recursive: true })` before creating file streams or Winston file transports.

## Review Notes
- The Morgan predefined formats, custom token usage, `skip` option, `stream` option, and custom JSON format function are consistent with the current Morgan 1.11.0 documentation.
- The rotating-file-stream examples use current `createStream()` options, including `interval`, `path`, `compress`, and `maxFiles`, consistent with rotating-file-stream 3.2.9 documentation.
- The Winston integration pattern of passing Morgan output through a stream with a `write()` method is technically valid.
