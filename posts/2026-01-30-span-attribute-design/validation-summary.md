# Validation Summary: How to Create Span Attribute Design

## Status
validated

## Post Type
Guide / best-practices tutorial on designing OpenTelemetry span attributes.

## Technologies Covered
- OpenTelemetry (specification, semantic conventions, JS SDK)
- `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-base`
- TypeScript with Express
- OpenTelemetry Collector (attributes processor, transform/OTTL processor)
- PostgreSQL (semantic convention example)

## Sources Consulted
- OpenTelemetry specification — Common attribute limits: https://opentelemetry.io/docs/specs/otel/common/#attribute-limits
- OpenTelemetry specification — Tracing SDK: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JS SDK source (`packages/opentelemetry-sdk-trace-base/src/utility.ts`) — default `attributeCountLimit = 128`, `attributeValueLengthLimit = Infinity`
- OpenTelemetry semantic conventions — Database attributes registry: https://opentelemetry.io/docs/specs/semconv/attributes-registry/db/
- OpenTelemetry semantic conventions — Deployment attributes registry: https://opentelemetry.io/docs/specs/semconv/attributes-registry/deployment/
- OpenTelemetry semantic conventions — HTTP, URL, Network, Server stable attributes

## Issues Found

1. **Fabricated/incorrect SDK default limits (Section 5 Mermaid diagram).** The original diagram listed defaults as `Max Attribute Key Length: 256 chars`, `Max Attribute Value Length: 16384 chars`, and `Max Array Elements: 128`. None of these match the OTel specification or the JS SDK. The spec/SDK defaults are: `attributeCountLimit = 128`, `attributeValueLengthLimit = Infinity`, `eventCountLimit = 128`, `linkCountLimit = 128`. There is no separate "attribute key length limit" or "array element limit" in the SDK. **Fix:** Rewrote the diagram to show the actual SDK defaults (attributes/events/links per span = 128, value length = unlimited).

2. **Configuring Limits code example referenced a non-existent `attributeKeyLengthLimit` field on `SpanLimits`.** The OpenTelemetry JS SDK `SpanLimits` interface does not define a key-length limit. **Fix:** Removed the `attributeKeyLengthLimit` entry and added comments noting actual JS SDK defaults (value length: Infinity; event/link count: 128).

3. **Deprecated database semantic convention names used throughout (Sections 2 and 6).** The stable database semantic conventions replaced the old names: `db.system` → `db.system.name`, `db.name` → `db.namespace`, `db.operation` → `db.operation.name`, `db.statement` → `db.query.text`, `db.sql.table` → `db.collection.name`. **Fix:** Updated the categories table, the database instrumentation example, the span-name comment, and the collector configuration block to use the stable names.

4. **Deprecated/non-standard deployment attribute names (Sections 1, 3, and 7).** `deployment.environment` was renamed to `deployment.environment.name`, and `deployment.version` is not part of the current registry — service version is canonically `service.version`. **Fix:** Replaced `deployment.environment` with `deployment.environment.name` and `deployment.version` with `service.version` everywhere they appeared.

## Review Notes

- HTTP, URL, network, server, and `user_agent.original` attributes shown in the post are stable per the current OpenTelemetry semantic conventions registry and required no changes.
- The OTel JS SDK API calls (`trace.getTracer`, `tracer.startSpan`, `tracer.startActiveSpan`, `span.setAttribute(s)`, `span.recordException`, `span.setStatus`, `span.addEvent`, `SpanKind.*`, `SpanStatusCode.*`, `context.active()`, `context.with()`) are all correctly used.
- A few minor cosmetic non-issues that were left intact: the `propagation` import in the inheritance example is unused; the `safeString` and `otelContext` imports in the final payment example are unused. These are illustrative excerpts, so they were left alone.
- The OTTL email-redaction pattern (`"@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"`) only redacts the domain portion of an email rather than the full local-part. This is illustrative and not incorrect, but a future revision could match the local-part as well.
- `db.sql.table` and `db.statement` may still be accepted by some backends for backward compatibility, but the stable conventions are now `db.collection.name` and `db.query.text`; readers should prefer the new names for new instrumentation.
