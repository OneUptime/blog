# Validation Summary: How to Configure OpenTelemetry SDK in Elixir/Erlang Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Erlang/Elixir SDK
- OpenTelemetry OTLP exporter
- Elixir runtime configuration
- OpenTelemetry sampling, propagation, resources, and span limits
- Phoenix, Ecto, and distributed Erlang clustering examples

## Sources Consulted
- OpenTelemetry Erlang/Elixir exporters: https://opentelemetry.io/docs/languages/erlang/exporters/
- OpenTelemetry Erlang/Elixir sampling: https://opentelemetry.io/docs/languages/erlang/sampling/
- OpenTelemetry Erlang/Elixir propagation: https://opentelemetry.io/docs/languages/erlang/propagation/
- OpenTelemetry Erlang/Elixir resources: https://opentelemetry.io/docs/languages/erlang/resources/
- OpenTelemetry Erlang/Elixir SDK HexDocs: https://hexdocs.pm/opentelemetry/
- OpenTelemetry exporter HexDocs: https://hexdocs.pm/opentelemetry_exporter/opentelemetry_exporter.html
- OpenTelemetry batch processor HexDocs: https://hexdocs.pm/opentelemetry/otel_batch_processor.html
- OpenTelemetry Erlang source configuration: https://github.com/open-telemetry/opentelemetry-erlang

## Issues Found
- Fixed the SDK architecture diagram so sampling happens before span processing.
- Replaced invalid OTLP exporter module references with the current `:opentelemetry_exporter` module.
- Replaced invalid top-level `defp` helpers in runtime configuration examples with anonymous functions that work in `.exs` files.
- Updated resource configuration examples from nested keyword lists to maps, matching the Erlang/Elixir SDK resource detector documentation.
- Removed unsupported exporter options such as `otlp_timeout`, `otlp_ssl_options`, `grpc_options`, retry options, and `max_export_batch_size`.
- Updated batch processor configuration to use supported keys: `max_queue_size`, `scheduled_delay_ms`, and `exporting_timeout_ms`.
- Corrected span limit configuration keys to `attribute_count_limit`, `attribute_value_length_limit`, `event_count_limit`, `link_count_limit`, `attribute_per_event_limit`, and `attribute_per_link_limit`.
- Fixed the custom sampler return value to return tracestate, not the trace ID, and changed attribute lookup to work with the attribute map shape used by the SDK.
- Corrected supported propagator names by replacing `:b3single` with `:b3` and noting that Jaeger propagation is not currently supported through `OTEL_PROPAGATORS`.
- Replaced invalid health-check code that called a non-exporter API with checks against `:otel_tracer_provider.force_flush/0` and the global tracer provider process.
- Removed the invalid `:opentelemetry.set_default_resource/1` example and clarified that `service.instance.id` must be configured before the SDK starts.
- Corrected the claim that trace context automatically propagates across arbitrary BEAM messages.
- Fixed troubleshooting guidance to lower, not increase, the sampling ratio for high memory usage.
- Replaced unsupported exporter `debug: true` configuration with supported logger and SDK log-level configuration.

## Review Notes
Elixir is not installed in this workspace, so snippets were not compiled locally. The review was performed against official OpenTelemetry documentation, HexDocs, and the current OpenTelemetry Erlang source.
