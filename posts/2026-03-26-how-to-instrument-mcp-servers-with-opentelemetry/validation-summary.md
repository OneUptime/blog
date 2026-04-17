# Validation Summary: How to Instrument MCP Servers with OpenTelemetry for Production Observability

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` (Node.js/TypeScript)
- OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/sdk-metrics`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- OpenTelemetry OTLP HTTP exporters (traces and metrics)
- OpenTelemetry Collector (OTLP receiver, batch/attributes processors, otlphttp exporter)
- OpenTelemetry `spanmetrics` connector
- OpenAI embeddings / chat completions APIs (referenced in example)
- Zod (referenced in schema examples)

## Sources Consulted
- OpenTelemetry JS SDK 2.0 migration notes: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- OpenTelemetry JS upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry specification, Trace API (status semantics): https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/api.md
- `@opentelemetry/semantic-conventions` npm package: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- OpenTelemetry Collector `spanmetricsconnector` docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/spanmetricsconnector
- MCP TypeScript SDK server documentation: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md
- Local inspection of `@modelcontextprotocol/sdk` v1.29.0 type declarations

## Issues Found
1. **`Resource` construction incompatible with OTel JS SDK 2.x.** The `tracing.js` example used `new Resource({ [ATTR_SERVICE_NAME]: "..." })`, which was the 1.x signature. In OTel JS SDK 2.0 (released Feb 2025), the `Resource` constructor signature changed (it now expects `{ attributes, ... }`), and the idiomatic factory is `resourceFromAttributes()`. Replaced the import and call with `resourceFromAttributes({ ... })` so the snippet works with current JS SDK versions.

2. **`span.setStatus` overwrite bug in `instrumentTool`.** The original code set `SpanStatusCode.ERROR` when a tool returned error-like content, then unconditionally called `span.setStatus({ code: SpanStatusCode.OK })` afterward. In the OTel JS SDK, `setStatus` does *not* reject OK following ERROR (only UNSET and OK-after-OK are rejected), so the error status was being silently overwritten. Wrapped the OK call in an `else` branch so the error status is preserved.

3. **`spanmetrics` histogram buckets were raw numbers.** The connector config used `buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 5000]`. The `spanmetricsconnector` parses bucket values as Go `time.Duration` strings and requires explicit units — raw integers will fail to parse. Updated to `[5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 5s]`.

## Review Notes
- `server.tool(name, schema, handler)` is still present in `@modelcontextprotocol/sdk` v1.29.0 but marked `@deprecated` in favor of `server.registerTool(name, config, handler)`. The existing code in the post still compiles and runs (with a deprecation warning), so it was left as-is per the "only fix what is technically wrong" rule. Future revisions may want to migrate examples to `registerTool` with an `inputSchema` config key for forward compatibility.
- The first MCP example uses `z.string()` without an explicit `import { z } from "zod"`. The second block fixes nothing but continues the same pattern — readers need to add the Zod import themselves. Not strictly incorrect for an illustrative snippet.
- The OpenTelemetry GenAI semantic conventions are still evolving, and the post acknowledges this; the `mcp.*` attributes used in the tutorial are reasonable custom conventions but are not (yet) part of the official semantic-conventions package.
- The `spanmetrics` connector emits `duration` metrics; the example text references RED (Rate, Error, Duration) dashboards which is an accurate characterization of what the connector produces.
- `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` are stable exports from `@opentelemetry/semantic-conventions` and were correctly used.
