# Validation Summary: How to Use TypeScript with Express.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Express.js
- Node.js
- npm
- CORS middleware
- Helmet middleware
- Docker

## Sources Consulted
- Express 5 error handling guide: https://expressjs.com/en/guide/error-handling/
- Express 5 API reference: https://expressjs.com/en/api/
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/
- npm CLI `npm ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Local package verification with current packages: `express@5.2.1`, `@types/express@5.0.6`, `typescript@6.0.3`

## Issues Found
- The controller and authentication examples used `UserRole` before importing it, then imported it at the bottom of the snippet. While imports can be top-level, this layout is confusing for readers and produced a less reliable copy/paste example. Changed both snippets to import `UserRole` with the other types at the top.
- The `asyncHandler` example only accepted handlers returning `Promise<void>` with untyped request parameters. The later router examples passed synchronous controllers with typed params and bodies, which failed to compile under strict TypeScript with current Express types. Replaced it with a generic `RequestHandler`-based wrapper that preserves Express request/response generics and accepts synchronous or promise-returning handlers.
- The async wrapper explanation implied rejected promises always need a wrapper. Express 5 automatically forwards rejected route-handler promises to `next`, so the text now clarifies that the wrapper is mainly useful for Express 4 compatibility or a consistent pattern.
- The Dockerfile used `node:20-alpine`, but Node.js 20 is EOL as of the current Node.js release schedule. Updated both build and production stages to `node:24-alpine`, which is currently LTS.
- The Dockerfile used `npm ci --only=production`. Updated it to the current documented form, `npm ci --omit=dev`, for installing production dependencies only.

## Review Notes
The tutorial examples were verified by compiling a representative project using the post's strict `tsconfig.json` and current npm package versions. Express 5 can handle rejected promises without a custom wrapper, so future revisions could simplify the routing examples by removing `asyncHandler` entirely when targeting Express 5 only.
