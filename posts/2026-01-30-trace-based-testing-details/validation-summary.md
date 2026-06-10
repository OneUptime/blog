# Validation Summary: How to Create Trace-Based Testing Details

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JS SDK (`@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/resources`)
- OpenTelemetry Collector (receivers, processors, exporters)
- Tracetest (OSS trace-based testing tool)
- Jest + supertest for integration testing
- Jaeger (all-in-one, Query API)
- Docker Compose
- GitHub Actions
- TypeScript

## Sources Consulted
- OpenTelemetry "Migrating away from the Jaeger exporter" blog post (https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/)
- OpenTelemetry Collector issue #11337 — `logging` exporter replaced with `debug` exporter
- OpenTelemetry JS API reference for `NodeSDK` (https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html)
- OpenTelemetry JS upgrade-to-2.x guide (https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md)
- Jaeger native OpenTelemetry support announcement (Jaeger 1.35+ accepts OTLP, default-on in newer versions)
- OpenTelemetry Trace Status Codes specification (UNSET=0, OK=1, ERROR=2) — matches code's `status.code === 2` for ERROR checks

## Issues Found

1. **OTel Collector `jaeger` exporter is removed.** The `otel-config.test.yaml` defined a `jaeger` exporter at `jaeger:14250` (gRPC). The Jaeger exporter was removed from official OpenTelemetry Collector distributions after v0.85.0 (late 2023); for a 2026 post this is outdated. Replaced it with an `otlp/jaeger` exporter sending to `jaeger:4317` (Jaeger v1.35+ accepts OTLP natively, and OTLP is enabled by default in recent versions). Updated the pipeline `exporters` list to match. Also removed the unused `14250:14250` port mapping from the `jaeger` service in `docker-compose.test.yml`.

2. **OTel Collector `logging` exporter is removed.** The same config used the `logging` exporter, which was replaced by the `debug` exporter starting v0.111.0 (Oct 2024). Renamed it to `debug` and updated the pipeline `exporters` list.

3. **Deprecated `new Resource({...})` API in OpenTelemetry JS.** The `IntegrationTestTracer` constructor used `new Resource({ 'service.name': serviceName })` and imported `Resource` from `@opentelemetry/resources`. The `Resource` class was removed from the exports in OpenTelemetry JS SDK 2.x (Feb 2025) in favor of `resourceFromAttributes(...)`. Updated the import and call site to use the current API.

4. **Bug in spread-call to `addSpan`.** The "Error Scenarios" test called `traceEngine.addSpan(...spans);`, but `addSpan(span: CollectedSpan)` is defined to take a single span — the spread only inserts the first element and silently drops the rest. Replaced with `spans.forEach(span => traceEngine.addSpan(span));` to match the pattern used in the other test blocks.

## Review Notes

- The post uses older HTTP semantic-convention attribute names like `http.method` and `http.route`. The stable HTTP semantic conventions (1.23.0+, Jan 2024) renamed these to `http.request.method` and kept `http.route`. The old names are still emitted by many instrumentations for compatibility, so the code still functions — left as-is to avoid scope creep, but readers writing fresh code should prefer the stable names.
- Similarly, `db.system` / `db.operation` are the older database semantic-convention names; the stable names are `db.system.name` / `db.operation.name`. Same compatibility caveat applies.
- `await this.sdk.start()` is harmless but no longer meaningful — `NodeSDK.start()` is synchronous and returns void in current versions. Awaiting a non-Promise resolves immediately, so the code still works. Left unchanged.
- `docker-compose.test.yml` declares `version: '3.8'`. The top-level `version` key has been obsolete since Docker Compose v2 — it's ignored with a warning but harmless. Left unchanged.
- The Tracetest YAML uses the older test-spec format with `selector` + `assertions`. Tracetest is now part of the Kubeshop ecosystem and the schema has evolved; readers should check the latest Tracetest docs for current syntax. Not a correctness bug today since older schemas still parse.
- The `paymentServiceContract` uses `version: '2.0.0'`. The example services and contract structure are illustrative — no real version pinning to verify against.
