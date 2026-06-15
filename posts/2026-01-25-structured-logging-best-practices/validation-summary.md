# Validation Summary: How to Implement Structured Logging Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Structured logging
- JSON logging
- Node.js
- TypeScript
- Express middleware
- AsyncLocalStorage
- OpenTelemetry-style trace correlation
- Log management and observability practices

## Sources Consulted
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Express 5.x API reference: https://expressjs.com/en/api/
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- TypeScript Handbook, Object Types: https://www.typescriptlang.org/docs/handbook/2/objects.html
- OneUptime website: https://oneuptime.com

## Issues Found
- The "complete logging implementation" TypeScript example referenced `LoggerConfig`, `HttpRequestInfo`, and `HttpResponseInfo` without defining them. Added minimal interfaces so the snippet is complete.
- The logger implementation used `this.getContext() || {}` and then accessed typed context fields. Under TypeScript checking this can produce property access errors because `{}` does not have `requestId`, `traceId`, and related fields. Changed these accesses to optional chaining on the returned context.
- The level-specific logging methods passed optional `attributes` to a parameter typed as a required record. Changed those calls to pass `attributes ?? {}`.
- The `error` and `fatal` methods spread optional `attributes` directly. Changed those spreads to use `attributes ?? {}`.
- The `PaymentError` example referenced an undeclared custom class. Replaced it with `new Error('Card declined')` while preserving the `error_code` attribute.
- The initial structured logging example used an email address as a normal logged field, which conflicted with the later warning to avoid logging PII. Changed it to `user_id`.
- The high-cardinality section discouraged unique request IDs even though the post correctly recommends request IDs for correlation. Reframed the section around unbounded indexed/faceted fields and changed the bad example to arbitrary user input, overly granular timestamps, and full request bodies.
- Updated the summary wording from broad "high-cardinality fields hurt query performance" to the more precise "unbounded indexed fields can hurt query performance and storage costs."

## Review Notes
The examples are intentionally framework-light and do not implement runtime log filtering, pretty formatting, or sampling despite showing configuration fields for those concerns. That is acceptable for a schema and implementation guide, but a production logger should either wire those configuration values into the logger or use a maintained logging library that already supports level filtering, serializers, redaction, and transports.
