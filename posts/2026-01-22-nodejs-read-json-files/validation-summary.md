# Validation Summary: How to Read JSON Files in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js CommonJS modules and `require()`
- Node.js `fs`, `fs/promises`, and file watching APIs
- ECMAScript modules and JSON import attributes
- JavaScript `JSON.parse`
- Node.js streams
- JSONStream
- stream-json
- chokidar
- JSON5
- Zod
- TypeScript

## Sources Consulted
- Node.js File System documentation: https://nodejs.org/api/fs.html
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- Node.js package/module loading documentation: https://nodejs.org/api/packages.html
- npm registry metadata for JSONStream: https://www.npmjs.com/package/JSONStream
- npm registry metadata for stream-json: https://www.npmjs.com/package/stream-json
- npm registry metadata for chokidar: https://www.npmjs.com/package/chokidar
- npm registry metadata for JSON5: https://www.npmjs.com/package/json5
- Zod documentation: https://zod.dev/packages/zod
- TypeScript module reference: https://www.typescriptlang.org/docs/handbook/modules/reference.html
- JSON standard, RFC 8259: https://www.rfc-editor.org/rfc/rfc8259

## Issues Found
- The ES modules section said "Node.js 18+" and "import assertion" while the example uses current import attributes. Node.js documents JSON import attributes as mandatory and notes they became non-experimental in Node.js 18.20.5, 20.18.3, and 22.12.0. Updated the heading to "Node.js 18.20.5+" and changed the wording to "import attribute."
- The JSONStream stream example required a third-party package but did not include an install command. Added `npm install JSONStream`.
- The chokidar example used `require('chokidar')` with `npm install chokidar`, but current chokidar v5 is ESM-only. Updated the install command to `npm install chokidar@4`, which supports CommonJS `require`.
- The CommonJS chokidar usage example used top-level `await`, which is not valid in a CommonJS script. Wrapped the usage in an async `main()` function and called `main()`.

## Review Notes
- The `fs.watch` example is technically valid, but production file watching can need debouncing and platform-specific handling.
- The TypeScript examples correctly demonstrate typing and manual runtime checks, but the `as Config` example is only a compile-time assertion and does not validate untrusted JSON at runtime.
