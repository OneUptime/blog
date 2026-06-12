# Validation Summary: How to Debug OpenTelemetry Instrumentation Issues

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenTelemetry SDK (Node.js, Python, Go)
- OpenTelemetry Collector (receivers, processors, exporters)
- OTLP exporters (HTTP and gRPC)
- OpenTelemetry context propagation (sync and async)
- OpenTelemetry sampling (head-based and tail-based)
- OpenTelemetry semantic conventions / resource attributes
- Express.js (used in examples)
- Flask / FastAPI (referenced in Python examples)
- cURL / grpcurl (used for diagnostic commands)
- Mermaid (for diagrams)

## Sources Consulted
- OpenTelemetry JS SDK 2.0 announcement and migration guide — https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- OpenTelemetry JS upgrade-to-2.x guide — https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- @opentelemetry/sdk-node NodeSDKConfiguration API docs — https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- @opentelemetry/exporter-trace-otlp-http package docs — https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http
- @opentelemetry/resources API docs — https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- @opentelemetry/semantic-conventions package docs — https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- OpenTelemetry Collector `logging` exporter deprecation/removal (issue #11337) — https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector `debug` exporter README — https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Python zero-code (auto-instrumentation) configuration — https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Collector tail_sampling processor README — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Go stdouttrace exporter — https://pkg.go.dev/go.opentelemetry.io/otel/exporters/stdout/stdouttrace

## Issues Found

1. **Missing `SimpleSpanProcessor` import in the Node.js "console exporter" example.** The snippet under "Step 2: Add Console Exporter for Debugging" used `new SimpleSpanProcessor(...)` but only imported `ConsoleSpanExporter` from `@opentelemetry/sdk-trace-base`. Added `SimpleSpanProcessor` to the destructured import so the example actually runs.

2. **Deprecated `logging` exporter in the Collector configuration.** The Collector's `logging` exporter was deprecated in v0.86.0 (Oct 2023) and fully removed in v0.111.0 (Oct 2024). Replaced both occurrences (the debug-logging YAML and the tail-sampling YAML) with the `debug` exporter, which is its modern replacement and accepts the same `verbosity: detailed` field.

3. **Removed `Resource` class and deprecated `SemanticResourceAttributes` in the Node.js resource example.** OpenTelemetry JS SDK 2.0 (released 2025) removed the `Resource` _class_ — it is now an interface and must be constructed via factory functions. Also, `SemanticResourceAttributes.*` constants are superseded by the new `ATTR_*` constants from `@opentelemetry/semantic-conventions`. Updated the example to:
   - Use `resourceFromAttributes({...})` instead of `new Resource({...})`.
   - Import and use `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` (the renamed semantic-conventions constants).

## Review Notes

- The Python auto-instrumentation flag `--service_name` is intentionally underscore-style (matching the other `--*_*` flags like `--traces_exporter`, `--exporter_otlp_endpoint`). This looked suspicious at first glance but is correct per the official zero-code Python configuration docs — no change needed.
- The `httpAgentOptions` config option on `OTLPTraceExporter` is correct in 2026 (still exported by `@opentelemetry/exporter-trace-otlp-http`).
- The `spanProcessors` (plural) `NodeSDK` option is the current/recommended form (singular `spanProcessor` is deprecated). The post uses the plural form correctly.
- The Go example using `stdouttrace.WithPrettyPrint()` and `trace.WithSyncer(...)` is current and correct.
- The OTLP port distinctions (4317 for gRPC, 4318 for HTTP) and the requirement that `url:` on the exporter constructor include the `/v1/traces` path while `OTEL_EXPORTER_OTLP_ENDPOINT` does not are both accurate.
- The Collector internal-metrics port (8888) and health_check extension port (13133) are still the documented defaults.
- The note "Default attributeValueLengthLimit: unlimited" matches the OpenTelemetry specification's default of no limit when unset; the count limits of 128 for attributes/events/links also match the spec.
- Minor caveat for future maintenance: `span.attributes` access in the "Debug Missing Span Attributes" example uses an internal API field that is not part of the public Span interface. The post already calls this out ("Note: This is internal API and may change"), so no change required.
