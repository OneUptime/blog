# Validation Summary: How to Build Plugin Architecture in Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- TypeScript
- Express
- ECMAScript modules and dynamic imports
- Node.js `vm` module
- Jest-style unit testing
- Plugin architecture patterns

## Sources Consulted
- Node.js ECMAScript Modules documentation: https://nodejs.org/api/esm.html
- Node.js URL API documentation for `pathToFileURL`: https://nodejs.org/api/url.html#urlpathtofileurlpath-options
- Node.js VM module documentation: https://nodejs.org/api/vm.html
- Express 5 API documentation for `express.json()` and `req.body`: https://expressjs.com/en/5x/api/express/#expressjsonoptions
- TypeScript Handbook, Modules Reference: https://www.typescriptlang.org/docs/handbook/modules/reference.html

## Issues Found
- The plugin loader used `await import(pluginPath)` where `pluginPath` was a directory. Node.js ESM resolution requires relative or absolute imports to be fully specified, and Node recommends `pathToFileURL()` for path-to-file URL conversion. Updated the loader to import `index.js` explicitly using `pathToFileURL(entryPath).href`.
- The dependency resolver only logged missing dependencies and still initialized dependent plugins, which contradicted the lifecycle diagram and dependency-resolution explanation. Changed missing dependencies to throw an error so unresolved plugins do not initialize as ready.
- The audit logger plugin registered bound hook callbacks but attempted to unregister newly bound function objects. Because each `.bind()` call returns a different function identity, unregistering would fail and leave callbacks registered. Stored bound callbacks on the instance and used those same references for register/unregister.
- The Express example read `req.body` without installing JSON body parsing middleware. Added `app.use(express.json())`, matching the Express built-in JSON parser behavior.
- The Express middleware generated a fallback request ID for `request:start` but did not reuse it for `request:complete`, so the completion hook could receive `undefined` when the header was absent. Stored `requestId` once and reused it.
- The Express example treated the `x-request-id` header as a plain string even though Node request headers can also be arrays. Normalized the header before passing it to hooks.
- Some hook callback examples relied on generic inference for callback payloads, which can leave callback data as `unknown` in TypeScript. Added explicit hook payload types for the user-login and request-start examples.
- The rate-limiter tests inferred hook result objects as `{ ip: string }`, so accessing `rateLimited` would be a TypeScript type error. Added a small `RequestStartData` type and passed it to `hooks.trigger<T>()`.

## Review Notes
The `vm` example includes a warning that it is not a complete security solution. This is directionally correct, but Node.js documentation is stronger: the `node:vm` module is not a security mechanism and should not be used to run untrusted code. A production plugin sandbox should use stronger process, container, permission, or isolate boundaries.
