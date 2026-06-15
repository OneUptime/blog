# Validation Summary: How to Fix 'UnhandledPromiseRejectionWarning' in Node.js

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Node.js
- JavaScript Promises
- async/await
- Express.js
- Jest

## Sources Consulted
- Node.js Process API documentation: https://nodejs.org/api/process.html
- Node.js Command-line API documentation: https://nodejs.org/api/cli.html
- Express.js Error Handling guide: https://expressjs.com/en/guide/error-handling/
- Jest configuration documentation: https://jestjs.io/docs/configuration
- MDN Promise.allSettled documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- MDN await documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await

## Issues Found
- The `--unhandled-rejections` options list was incomplete. The Node.js CLI documentation lists `throw`, `strict`, `warn`, `warn-with-error-code`, and `none`, with `throw` as the default since Node.js 15. Updated the options list and added a `throw` example.
- The Express route example described async route handlers as unhandled without version context. Express 5 automatically calls `next(value)` when a returned Promise rejects or an async handler throws. Updated the comments to scope the wrapper and try-catch fixes to Express 4 and added a note that Express 5 handles returned rejected Promises automatically.

## Review Notes
The remaining examples use current JavaScript and Node.js APIs. Some snippets use `await` at top level for brevity; that is valid in ES modules or when placed inside an async function.
