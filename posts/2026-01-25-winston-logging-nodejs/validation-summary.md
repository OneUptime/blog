# Validation Summary: How to Use Winston for Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Winston
- winston-daily-rotate-file
- Express.js
- Morgan
- npm

## Sources Consulted
- Winston official README: https://github.com/winstonjs/winston
- winston-daily-rotate-file official README: https://github.com/winstonjs/winston-daily-rotate-file
- Morgan official Express middleware documentation: https://expressjs.com/en/resources/middleware/morgan/
- Logform official README for Winston formats and error handling: https://github.com/winstonjs/logform

## Issues Found
- The multiple transports example set the logger-level filter to `info` while setting the console transport to `debug`. Winston applies logger and transport level filtering, so `debug` logs would not reach the console. Changed the logger level to `debug` so the console can receive debug logs while the file transports still filter at `info` and `error`.
- The error logging example defined an `errorFormat` formatter for nested `Error` objects but did not add it to the logger format pipeline. Added a minimal logger configuration showing `errorFormat()` before `format.json()` so nested error metadata is serialized with message, stack, and name.

## Review Notes
- Winston's built-in `format.errors({ stack: true })` is appropriate when logging an `Error` directly. For nested error metadata such as `logger.error('Operation failed', { error })`, a custom formatter like the one shown in the post is still needed.
- The production sanitization example only redacts top-level fields. A production application may need recursive redaction for nested request bodies, headers, or metadata.
