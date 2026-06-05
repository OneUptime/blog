# Validation Summary: How to Configure the Memory Limiter Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- Memory limiter processor
- Batch processor
- Filter processor
- Tail sampling processor
- OTLP HTTP exporter
- Collector internal telemetry
- Kubernetes and Docker memory limits

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter components documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector tail sampling examples: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Local validation with `otel/opentelemetry-collector-contrib:latest` (`otelcol-contrib` v0.153.0) using the `validate` command.

## Issues Found
- The post described `limit_mib` as the soft limit and `limit_mib + spike_limit_mib` as the hard threshold. Current OpenTelemetry documentation defines `limit_mib` as the hard heap target and the soft limit as `limit_mib - spike_limit_mib`. Updated the diagram, parameter explanations, examples, checklist, troubleshooting guidance, and expected test behavior.
- The post said memory above the hard threshold is dropped. The memory limiter refuses data by returning retryable errors to the previous component and forces garbage collection above the hard limit; data loss depends on whether the previous component can retry. Updated the wording from dropping to refusing/back-pressure where appropriate.
- The internal telemetry examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced those snippets with the current `service.telemetry.metrics.readers` Prometheus pull exporter syntax.
- The memory metric name `process_runtime_go_mem_heap_alloc_bytes` is outdated for current Collector internal telemetry. Updated it to `otelcol_process_runtime_heap_alloc_bytes`.
- Several standalone `memory_limiter` snippets omitted `check_interval`. Current collector validation rejects memory limiter configs where `check_interval` is not greater than zero, so copied snippets would fail. Added `check_interval: 1s` to standalone examples.
- The testing example used the deprecated `logging` exporter. Replaced it with the current `debug` exporter.
- The tail sampling example used a `status_code` policy without the required `status_code.status_codes` configuration. Added `status_code: { status_codes: [ERROR] }` in expanded YAML form.

## Review Notes
The post now validates as a current OpenTelemetry Collector guide. Future revisions could mention `limit_percentage` and `spike_limit_percentage`, which upstream documentation generally recommends for containerized environments, but the fixed `limit_mib` examples are valid when operators intentionally manage limits in MiB.
