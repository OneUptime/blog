# Validation Summary: How to Handle Errors Properly in Node.js

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Node.js
- JavaScript errors, promises, async/await, try/catch/finally
- Express error handling middleware
- Joi validation
- HTTP server graceful shutdown patterns
- Retry and circuit breaker patterns

## Sources Consulted
- Node.js Errors documentation: https://nodejs.org/api/errors.html
- Node.js Process documentation: https://nodejs.org/api/process.html
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js Globals documentation for fetch: https://nodejs.org/api/globals.html
- Express error handling guide: https://expressjs.com/en/guide/error-handling/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- Joi API documentation: https://joi.dev/api/
- MDN JavaScript try...catch reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch

## Issues Found
- The graceful shutdown example used `await server.close()`. Node.js HTTP/HTTPS `server.close()` is callback-based and returns the server instance, so awaiting it does not wait for the close operation to finish. Updated the snippet to wrap `server.close()` in a Promise.
- The async handler wrapper section implied the wrapper is generally needed for async Express routes. Express 5 forwards rejected promises from route handlers and middleware automatically. Added a concise comment clarifying that the wrapper is for Express 4 and that Express 5 handles rejected promises automatically.

## Review Notes
The remaining examples are technically valid as illustrative snippets. Some snippets use placeholder functions such as `openFile`, `db.users.findById`, and `fetchFromAPI`; these are clearly contextual examples rather than complete runnable programs.
