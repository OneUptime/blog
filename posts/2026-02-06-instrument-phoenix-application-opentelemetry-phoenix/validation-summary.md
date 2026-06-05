# Validation Summary: How to Instrument a Phoenix Application with opentelemetry_phoenix

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Elixir
- Phoenix
- opentelemetry_phoenix
- opentelemetry_cowboy
- opentelemetry_exporter
- Plug.Telemetry

## Sources Consulted
- OpentelemetryPhoenix HexDocs: https://hexdocs.pm/opentelemetry_phoenix/
- OpentelemetryPhoenix v1.2.0 HexDocs: https://hexdocs.pm/opentelemetry_phoenix/1.2.0/OpentelemetryPhoenix.html
- opentelemetry_phoenix source in open-telemetry/opentelemetry-erlang-contrib: https://github.com/open-telemetry/opentelemetry-erlang-contrib/blob/main/instrumentation/opentelemetry_phoenix/lib/opentelemetry_phoenix.ex
- OpenTelemetry Erlang/Elixir exporters documentation: https://opentelemetry.io/docs/languages/erlang/exporters/
- OpenTelemetry Erlang/Elixir resources documentation: https://opentelemetry.io/docs/languages/erlang/resources/
- opentelemetry_exporter HexDocs: https://hexdocs.pm/opentelemetry_exporter/
- OpenTelemetry.Tracer HexDocs: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Tracer.html
- Phoenix Telemetry guide: https://hexdocs.pm/phoenix/telemetry.html
- Phoenix.Logger instrumentation documentation: https://hexdocs.pm/phoenix/Phoenix.Logger.html

## Issues Found
- The post claimed `opentelemetry_phoenix` automatically creates spans for endpoint, router, pipeline, controller, view, and template stages. Updated this to state that the library supports endpoint/router telemetry, router exceptions, and optional LiveView events, while Cowboy provides the HTTP server span.
- The dependency list omitted `opentelemetry_cowboy`, which is required for the recommended Plug.Cowboy setup. Added `{:opentelemetry_cowboy, "~> 1.0"}` and updated OpenTelemetry dependency versions to match official examples more closely.
- The setup example called `OpentelemetryPhoenix.setup(adapter: :cowboy2)` but omitted `:opentelemetry_cowboy.setup()`. Added the Cowboy setup call before the supervision tree starts.
- The SDK/exporter configuration used an unsupported `config :opentelemetry, :processors` shape for current official Elixir examples. Replaced it with `span_processor: :batch`, `traces_exporter: :otlp`, and `config :opentelemetry_exporter` options.
- The post did not mention the required `Plug.Telemetry` endpoint plug. Added an endpoint snippet showing `plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]`.
- The customization section used a nonexistent `span_attributes` option for `OpentelemetryPhoenix.setup/1`. Replaced it with a plug that calls `OpenTelemetry.Tracer.set_attributes/1` on the active span and filters nil values.
- The sensitive-data section suggested mutating `conn.params` in a custom plug to prevent tracing sensitive data. Replaced it with Phoenix `:filter_parameters` configuration and guidance to avoid adding unsafe custom span attributes.
- The health-check section referenced an undefined `DisableTracingPlug` and implied per-route tracing could be disabled by the router. Updated it to route health checks separately and filter or sample spans in the collector/backend.
- The verification command block was marked as Elixir even though it contained shell commands. Changed it to `bash`.
- The performance section made an unsupported claim about the default configuration handling thousands of requests per second without noticeable overhead. Replaced it with guidance to measure overhead in the target workload.

## Review Notes
The post is now technically aligned with current `opentelemetry_phoenix` documentation. Future improvements could add a concrete OpenTelemetry Collector filter or sampling example for health-check spans, but that would be new content rather than a correction.
