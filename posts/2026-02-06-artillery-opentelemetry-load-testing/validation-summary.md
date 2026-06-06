# Validation Summary: How to Use Artillery with OpenTelemetry for Load Testing Distributed Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Artillery
- OpenTelemetry
- W3C Trace Context propagation
- OTLP over HTTP
- Node.js / JavaScript
- YAML
- jq / curl

## Sources Consulted
- Artillery OpenTelemetry documentation: https://www.artillery.io/docs/observability/opentelemetry
- Artillery Observability / publish-metrics documentation: https://www.artillery.io/docs/observability
- Artillery HTTP engine hooks documentation: https://www.artillery.io/docs/reference/engines/http
- Artillery Extension APIs documentation: https://www.artillery.io/docs/reference/extension-apis
- Artillery expect plugin documentation: https://www.artillery.io/docs/reference/extensions/expect
- Artillery CLI run documentation: https://www.artillery.io/docs/reference/cli/run
- Artillery CLI report documentation and local `artillery@2.0.32 --help` output: https://www.artillery.io/docs/reference/cli/report
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript tracing documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/tracing.md
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- npm registry checks for `artillery`, `artillery-plugin-opentelemetry`, and OpenTelemetry packages.

## Issues Found
- The post installed `artillery-plugin-opentelemetry`, but that package is not published on npm. Removed the package install and updated the post to use Artillery's built-in `publish-metrics` plugin.
- The OpenTelemetry configuration used an unsupported `plugins.opentelemetry` shape with `exporter.type`, `propagate`, `serviceName`, and `attributes` at the wrong level. Replaced it with the documented `plugins.publish-metrics` configuration using `type: "open-telemetry"`, `serviceName`, `resourceAttributes`, and `traces`.
- The example used `expect` assertions without enabling Artillery's `expect` plugin. Added `expect: {}` to the main config.
- The custom plugin example subscribed to `beforeRequest` and `afterResponse` as plugin events, but Artillery plugin events do not include those request lifecycle hooks. Reworked the example into a custom processor using documented HTTP hooks.
- The custom OpenTelemetry JavaScript used outdated SDK patterns (`new Resource(...)` and `provider.addSpanProcessor(...)`). Updated it to use `resourceFromAttributes(...)` and `spanProcessors` in the `NodeTracerProvider` constructor.
- The custom JavaScript used raw status code `2` for errors and shadowed the OpenTelemetry `context` import. Updated it to use `SpanStatusCode.ERROR` and renamed the OpenTelemetry context import.
- The custom processor now guards optional response timing fields and flushes/shuts down the provider on process exit signals.
- The `artillery run` command placed `--output` after the script. Artillery CLI supports `--output`; the documented form is `artillery run --output results.json load-test.yaml`, so the command was updated.
- The text overstated that the built-in OpenTelemetry reporter alone propagates trace context through backend services. Adjusted the wording to distinguish Artillery trace export from explicit W3C trace context propagation.

## Review Notes
- The generic trace-backend `curl` endpoint is illustrative rather than portable; real query syntax depends on the backend, such as Jaeger, Tempo, Honeycomb, or New Relic.
- Artillery's current docs mention `artillery report` as removed in one place, but `artillery@2.0.32 --help` still lists the command. The post keeps the command because it is available in the checked CLI.
