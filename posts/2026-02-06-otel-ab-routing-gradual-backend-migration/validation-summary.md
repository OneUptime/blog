# Validation Summary: How to Set Up A/B Routing in the Collector for Gradual Backend Migration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- OpenTelemetry Collector probabilistic sampler processor
- OTLP receiver and exporter
- Collector internal metrics
- Unix signals for Collector configuration reload

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector forward connector README: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.153.0/connector/forwardconnector
- OpenTelemetry probabilistic sampler processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/samplingprocessor/probabilisticsamplerprocessor
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector `otelcol` package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/otelcol
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post described two samplers with the same `hash_seed` and complementary percentages as an 80/20 route split. With trace-ID hashing, equal seeds and different percentages do not create complementary sets; the lower percentage is a subset of the higher one. I changed the migration pattern to keep the old backend at 100% while mirroring a sampled percentage to the new backend, which matches the later schedule and avoids losing traces during validation.
- The post said the same trace always goes to the same destination. The probabilistic sampler consistently includes or excludes a trace for a given sampler; it does not choose a destination by itself. I corrected the explanation.
- The initial config sent only 80% to the old backend, which conflicted with the safer migration strategy described later. I changed the old backend sampler to 100%.
- The config reload section claimed file-watcher based automatic reload and used an unrelated internal telemetry feature gate. I changed it to start the Collector normally and send `SIGHUP` after updating the config.

## Review Notes
The endpoint and TLS examples are plausible for OTLP/gRPC. The validation curl examples are intentionally backend-specific placeholders, so they should be adapted to the actual old backend and OneUptime API endpoints before production use.
