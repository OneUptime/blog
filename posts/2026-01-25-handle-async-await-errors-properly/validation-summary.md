# Validation Summary: How to Handle Async/Await Errors Properly

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JavaScript async/await
- Node.js process error events
- Fetch API
- JavaScript Promise APIs
- Express.js error handling middleware
- npm packages: await-to-js, express-async-handler

## Sources Consulted
- Node.js Process documentation: https://nodejs.org/api/process.html
- Node.js Global Objects documentation for fetch: https://nodejs.org/api/globals.html#fetch
- Express.js Error Handling guide: https://expressjs.com/en/guide/error-handling/
- MDN Promise.all documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- MDN Promise.allSettled documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- MDN await operator documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
- await-to-js README: https://github.com/scopsy/await-to-js
- express-async-handler README: https://github.com/Abazhenov/express-async-handler

## Issues Found
- The Express.js section said Express does not catch async errors by default. This is only accurate for Express 4 style promise-returning handlers; Express 5 automatically calls `next(value)` when returned promises reject or async handlers throw. Updated the wording and comments to qualify the behavior as Express 4-specific.
- The unhandled rejection example said not to exit because unhandled rejections are just a warning in Node 15+. Current Node.js defaults treat unhandled rejections as uncaught exceptions when not otherwise handled, and Node documentation warns that normal operation should not resume after uncaught exceptions. Updated the guidance to treat the condition as fatal, log it, close resources, and exit.

## Review Notes
- The timeout helper correctly causes the caller to stop waiting after the timeout, but it does not cancel the underlying operation. For `fetch`, a future improvement would be to use `AbortController` so the HTTP request itself is aborted.
- The custom error class uses `Error.captureStackTrace`, which is appropriate in Node.js/V8 but is not a cross-runtime JavaScript API.
