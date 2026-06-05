# Validation Summary: How to Export OpenTelemetry Data from Elixir Applications to Jaeger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- Elixir
- Erlang OpenTelemetry SDK/API
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- Jaeger
- Docker
- Elasticsearch-backed Jaeger deployment

## Sources Consulted
- OpenTelemetry Erlang/Elixir exporters documentation: https://opentelemetry.io/docs/languages/erlang/exporters/
- OpenTelemetry Erlang/Elixir API documentation: https://hexdocs.pm/opentelemetry_api/
- OpenTelemetry Erlang/Elixir Tracer documentation: https://opentelemetry-api.hexdocs.pm/OpenTelemetry.Tracer.html
- OpenTelemetry Erlang/Elixir batch processor documentation: https://hexdocs.pm/opentelemetry/otel_batch_processor.html
- OpenTelemetry Erlang/Elixir sampling documentation: https://opentelemetry.io/docs/languages/erlang/sampling/
- opentelemetry_exporter OTLP documentation: https://hexdocs.pm/opentelemetry_exporter/otel_exporter_otlp.html
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Jaeger exporter migration guidance: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.75/deployment/
- Jaeger getting started/API port documentation: https://www.jaegertracing.io/docs/1.26/getting-started/

## Issues Found
- Corrected the export pipeline to remove direct export through Jaeger Agent and native Jaeger format. Current guidance is OTLP to an OpenTelemetry Collector, then OTLP to Jaeger, or direct OTLP to Jaeger.
- Updated package versions to current OpenTelemetry Erlang/Elixir package ranges and placed `opentelemetry_exporter` before the SDK dependency as recommended by official docs.
- Fixed OpenTelemetry resource and batch processor configuration to use current `resource`, `span_processor`, `traces_exporter`, and `bsp_*` application environment keys.
- Removed the obsolete `OpenTelemetry.register_application_tracer/1` initialization call from the current API example.
- Replaced deprecated runtime batch processor exporter replacement with guidance to filter noisy spans in the Collector.
- Replaced `:otel_batch_processor.force_flush()` with `:otel_tracer_provider.force_flush()`.
- Fixed the health-check example to use Jaeger's admin endpoint instead of appending `/health` to an OTLP ingest endpoint.
- Updated the Collector config to use `otlp/jaeger` instead of the removed/deprecated native `jaeger` exporter.
- Replaced undocumented app-side exporter telemetry events with Jaeger/Collector metrics endpoint guidance.
- Completed the parent-based sampler example with local parent states.

## Review Notes
The post is technically relevant and now aligns with current OpenTelemetry Erlang/Elixir, OTLP, Collector, and Jaeger guidance. Future improvements could include adding a Docker Compose example for running the Elixir app, Collector, Jaeger, and Elasticsearch on the same network.
