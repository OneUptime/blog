# Validation Summary: How to Implement Event Metadata Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Node.js crypto and async context APIs
- Express middleware
- PostgreSQL
- JSONB and GIN indexes
- Kubernetes pod metadata environment variables
- OpenTelemetry JavaScript API
- W3C Trace Context
- Event-driven architecture metadata patterns

## Sources Consulted
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Express 5.x API reference: https://expressjs.com/en/api/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript context documentation: https://opentelemetry.io/docs/languages/js/context/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- PostgreSQL constraints documentation: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL JSONB indexing documentation: https://www.postgresql.org/docs/current/datatype-json.html
- Kubernetes Downward API environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/environment-variable-expose-pod-information/

## Issues Found
- The Node.js imports used bare module names for `crypto` and `async_hooks`. Updated them to `node:crypto` and `node:async_hooks`, matching current Node.js documentation and avoiding ambiguity with package names.
- The Express correlation middleware read headers through `req.headers` with direct string casts. Updated it to use `req.get(...)`, which returns string header values through Express's request API and avoids unsafe casts from `string | string[] | undefined`.
- The schema-aware event example used `createHash` without importing it. Added `import { createHash } from 'node:crypto';`.
- The PostgreSQL schema declared `correlation_id UUID`, but the post's examples use request-style correlation IDs such as `req-abc-123` and `req-001`. Changed `correlation_id` to `VARCHAR(255)` so the schema accepts the documented values.
- The PostgreSQL schema declared `causation_id UUID NOT NULL` while also using `ON DELETE SET NULL`. Changed `causation_id` to nullable and updated the TypeScript row interfaces to `string | null`, because PostgreSQL can only set the column to null if the column allows nulls.
- The OpenTelemetry consumer example reconstructed a `traceparent` string but returned `context.active()` instead of extracting a context. Updated it to import `Context`, `ROOT_CONTEXT`, and `propagation`, then return `propagation.extract(ROOT_CONTEXT, { traceparent })`.

## Review Notes
Some snippets intentionally depend on application-specific types and request extensions, such as `EventBus`, `Pool`, `req.user`, `req.tenant`, and `eventBus`. Those are acceptable in context as placeholders for the reader's own application code. The Kubernetes environment variable names in the example are also application-defined names that must be populated with the Downward API in a real deployment.
