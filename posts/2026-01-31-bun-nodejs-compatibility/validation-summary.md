# Validation Summary: How to Run Node.js Apps with Bun

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Bun (JavaScript runtime)
- Node.js
- JavaScriptCore (JS engine)
- Express.js
- Fastify (`@fastify/cors`)
- `bun:sqlite` (built-in SQLite)
- `bun:test` (built-in test runner)
- `bcryptjs`, `better-sqlite3`, `sharp` (referenced as native module alternatives)
- Node.js built-in modules (`fs`, `fs/promises`, `path`, `crypto`, `process`)

## Sources Consulted
- Bun runtime docs — https://bun.sh/docs/runtime/nodejs-apis
- Bun `bun:sqlite` docs — https://bun.sh/docs/api/sqlite
- Bun env docs — https://bun.sh/docs/runtime/env
- Bun utils (`Bun.env`, `Bun.version`) — https://bun.sh/docs/api/utils
- Bun `bun:test` docs — https://bun.sh/docs/cli/test
- Bun runtime/modules — https://bun.sh/docs/runtime/modules
- Node.js v18.11.0 release notes (`node --watch`) — https://nodejs.org/en/blog/release/v18.11.0
- `@fastify/cors` on npm — https://www.npmjs.com/package/@fastify/cors
- Fastify server reference — https://fastify.dev/docs/latest/Reference/Server/
- Express 4.x API reference — https://expressjs.com/en/4x/api.html

## Issues Found
No technical issues found. All verified claims passed:

- `bun:sqlite` exports `Database` with `run`, `prepare`, `query`/`.all()` methods as used in the post.
- Bun automatically loads `.env` files without `dotenv`.
- `Bun.env` is a valid alias for `process.env`; `Bun.version` is a valid string property.
- `bun:test` exports `describe`, `test`, `expect`, `beforeAll`, `afterAll`.
- `bun app.ts` runs TypeScript natively; `bun run <script>` executes package.json scripts.
- `node --watch` is valid (introduced in Node 18.11.0, stable in 20.13.0).
- Bun uses JavaScriptCore.
- `__dirname` / `__filename` are supported in CommonJS in Bun.
- `@fastify/cors` is the current package name (scoped form replaced legacy `fastify-cors`).
- `fastify.listen({ port, host })` matches the current Fastify options-object signature.
- Express middleware usage (`express.json()`, `express.urlencoded({ extended: true })`, `express.static()`) matches Express 4.16+ API.

## Review Notes
- The CommonJS instantiation `new (require('bun:sqlite').Database)('mydb.sqlite')` is syntactically valid but stylistically unusual; the more idiomatic form is `const { Database } = require('bun:sqlite'); const db = new Database('mydb.sqlite');`. Not a technical error, so left unchanged.
- The post does not pin Bun or Node.js versions. Some claims (e.g. degree of Express/Fastify compatibility, native-module support breadth) evolve with each Bun release — readers should consult the current Bun compatibility page, as the post itself recommends.
- The comment "For complex image processing, sharp often works with Bun" is accurate at time of review (sharp publishes prebuilt binaries that Bun can load), though this can change between major Bun releases.
