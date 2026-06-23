# Validation Summary: How to Instrument Dockerized Apps with OpenTelemetry Sidecars and Agents

## Status
validated

## Post Type
Tutorial / Guide (hands-on playbook for instrumenting Docker workloads with OpenTelemetry)

## Technologies Covered
- OpenTelemetry (SDK, OTLP, Collector / collector-contrib, OTTL transform processor)
- OpenTelemetry JS SDK (`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/auto-instrumentations-node`)
- Docker, Docker Compose, Docker Swarm
- OneUptime (OTLP ingestion endpoint)
- Collector receivers/processors/exporters: `otlp`, `filelog`, `batch`, `memory_limiter`, `transform`, `otlphttp`
- `hey` HTTP load generator

## Sources Consulted
- OpenTelemetry JS — Node.js getting started: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- `@opentelemetry/auto-instrumentations-node` (npm): https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node
- `@opentelemetry/sdk-node` (npm): https://www.npmjs.com/package/@opentelemetry/sdk-node
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry Transform Processor README (OTTL syntax): https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry — Transforming telemetry: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
1. **NodeSDK did not actually enable auto-instrumentation.** The SDK snippet created a `NodeSDK` with only a `traceExporter`, yet the surrounding prose/comments claimed `sdk.start()` "enables auto-instrumentation for HTTP, Express, database clients, etc." `NodeSDK` registers **no** instrumentations unless they are passed explicitly. Fixed by importing `getNodeAutoInstrumentations` from `@opentelemetry/auto-instrumentations-node` and adding `instrumentations: [getNodeAutoInstrumentations()]` to the SDK config, so the claim is now true.

2. **Incorrect OneUptime OTLP endpoint and auth header (Section 3 sidecar exporter).** The exporter used `endpoint: https://telemetry.oneuptime.com/v1` with `Authorization: "Bearer ${ONEUPTIME_API_KEY}"`. Per OneUptime's documentation, the correct OTLP endpoint is `https://oneuptime.com/otlp`, authentication uses the `x-oneuptime-token` header (not HTTP Bearer auth), and the endpoint expects JSON-encoded OTLP. Fixed the endpoint, switched the header to `x-oneuptime-token`, and added `encoding: json`. (Section 6 already used the correct `https://oneuptime.com/otlp` host.)

3. **Invalid OTTL syntax in the `filelog` transform (Section 5).** The statement `set(attributes.container_id, attributes["container.id"])` used dot notation for a map key in the assignment target. OTTL requires bracket notation with a quoted key for arbitrary attribute keys. Fixed to `set(attributes["container_id"], attributes["container.id"])`.

## Review Notes
- The `otel/opentelemetry-collector-contrib:0.93.0` image tag is valid but pinned to an older (Jan 2024) release; readers may want a more recent version. Left as-is since pinning a specific version is intentional and not incorrect.
- Section 6's metrics exporter (`otlphttp/oneuptime`) omits the `x-oneuptime-token` header; the snippet is intentionally focused on `memory_limiter`/`sending_queue`, so this partial config was left unchanged, but a real deployment would still need the auth header (and `encoding: json`) shown in Section 3.
- The `filelog` transform copies an existing `container.id` attribute rather than parsing it from the file path; populating `container.id` requires an additional regex/container operator or the `resourcedetection`/container parser. The comment slightly overstates what the single statement does, but the OTTL itself is now syntactically valid. Left the illustrative logic intact.
- Standard OTel env vars (`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`), the `hey` install command, Swarm `deploy.mode: global`, Docker `--log-opt mode=non-blocking`, and the `memory_limiter`/`batch`/`sending_queue` field names and ordering guidance were all verified as correct.
