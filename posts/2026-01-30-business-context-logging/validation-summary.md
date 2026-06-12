# Validation Summary: How to Build Business Context Logging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- TypeScript
- Node.js AsyncLocalStorage
- Express middleware
- OpenTelemetry JavaScript API
- Winston logging
- PostgreSQL-style SQL queries
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry JavaScript API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.TraceAPI.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- TypeScript useUnknownInCatchVariables documentation: https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- Express 5.x API reference: https://expressjs.com/en/api/
- Winston documentation: https://github.com/winstonjs/winston
- PostgreSQL JSON functions and operators documentation: https://www.postgresql.org/docs/current/functions-json.html

## Issues Found
- The business event schema used `monetary_value`, while the logger and best-practice guidance used cent-based fields. Changed the schema field to `monetary_value_cents` so the schema matches the emitted event shape and the recommendation to store money as integer cents.
- The OpenTelemetry import included an unused `context` symbol. Removed it so the example remains clean and avoids failing projects that enforce `noUnusedLocals`.
- The context store comment said `get()` returned an empty object when no context was set, but the implementation returns `{ correlation_id: 'unknown' }`. Updated the comment to avoid inaccurate behavior documentation.
- The Express middleware accessed `req.user` on the base `Request` type. Added local `AuthenticatedUser` and `AuthenticatedRequest` interfaces so the TypeScript example type-checks without relying on undeclared request augmentation.
- The correlation ID header was cast directly to `string`, even though Node/Express header values can be arrays. Added handling for array-valued headers before falling back to `randomUUID()`.
- The order service catch block accessed `error.message` and `error.code` directly. Updated it to narrow `error` before reading fields, which is compatible with TypeScript's `unknown` catch variable behavior.
- The SQL examples queried `attributes->>'...'`, but the logger flattens attributes into the structured log object. Updated the SQL examples to query `failure_reason`, `attempted_total_cents`, and `mrr_change_cents` as top-level fields.

## Review Notes
The examples are illustrative and omit surrounding application types such as `CartItem`, `Order`, and `Subscription`, which is acceptable for this style of post. A production implementation should also define a concrete log storage schema or backend-specific query syntax, because the SQL examples assume a relational table where structured log fields are available as columns.
