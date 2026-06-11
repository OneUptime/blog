# Validation Summary: How to Create Log Level Guidelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Node.js
- Winston
- Express
- prom-client
- Fluentd
- ESLint
- Logging and observability practices

## Sources Consulted
- Winston official README: https://github.com/winstonjs/winston
- Express 5.x API reference: https://expressjs.com/en/5x/api/
- Express body-parser middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/
- prom-client official README: https://github.com/siimon/prom-client
- Fluentd grep filter documentation: https://docs.fluentd.org/filter/grep
- Fluentd record_transformer documentation: https://docs.fluentd.org/filter/record_transformer

## Issues Found
- The retry example used `sleep(1000 * attempt)` while the comment said "Exponential backoff." Changed it to `sleep(1000 * 2 ** (attempt - 1))` so the example matches the documented behavior.
- The Express runtime log-level API example read `req.body` without registering JSON body parsing middleware. Added `app.use(express.json());` before the route handlers.
- The `LevelFilterProcessor` used `||` defaults for level lookup values. Because `debug` maps to `0`, `new LevelFilterProcessor('debug')` incorrectly defaulted to `info`. Changed the defaults to nullish coalescing (`??`) so `0` remains valid.
- The custom ESLint rule assumed `logger.error()` always had a first argument. Added a `message` guard so the rule does not throw while inspecting calls without arguments.

## Review Notes
The article is a general guideline document with illustrative snippets rather than a complete runnable project. Several examples rely on application-specific types and globals such as `User`, `Request`, `logger`, `db`, `cache`, and `req.user`; that is acceptable for the post's scope, but a future runnable companion repository would need explicit imports, type declarations, and Express request type augmentation.
