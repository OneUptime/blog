# Validation Summary: How to Set Up Distributed Tracing Across Elixir Microservices with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elixir
- Erlang/Elixir OpenTelemetry SDK and API
- OpenTelemetry OTLP exporter
- OpenTelemetry Phoenix instrumentation
- OpenTelemetry Cowboy instrumentation
- OpenTelemetry Finch instrumentation
- Phoenix
- Finch
- W3C Trace Context propagation
- OpenTelemetry sampling and resource configuration

## Sources Consulted
- OpenTelemetry Erlang/Elixir documentation: https://opentelemetry.io/docs/languages/erlang/
- OpenTelemetry Erlang/Elixir SDK configuration: https://hexdocs.pm/opentelemetry/
- OpenTelemetry Erlang/Elixir resources: https://opentelemetry.io/docs/languages/erlang/resources/
- OpenTelemetry Erlang/Elixir sampling: https://opentelemetry.io/docs/languages/erlang/sampling/
- OpenTelemetry Erlang/Elixir propagation: https://opentelemetry.io/docs/languages/erlang/propagation/
- OpenTelemetry Erlang/Elixir API `OpenTelemetry.Tracer`: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Tracer.html
- OpenTelemetry Erlang/Elixir API `OpenTelemetry.Ctx`: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Ctx.html
- OpenTelemetry Erlang/Elixir API `OpenTelemetry.Span`: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Span.html
- OpenTelemetry text map propagator: https://hexdocs.pm/opentelemetry_api/otel_propagator_text_map.html
- OpenTelemetry Phoenix instrumentation: https://hexdocs.pm/opentelemetry_phoenix/
- OpenTelemetry Finch instrumentation: https://hexdocs.pm/opentelemetry_finch/OpentelemetryFinch.html
- OpenTelemetry Erlang GitHub README: https://github.com/open-telemetry/opentelemetry-erlang
- Hex.pm OpenTelemetry package listing: https://hex.pm/orgs/opentelemetry

## Issues Found
- Updated OpenTelemetry dependency versions to current compatible releases and moved `:opentelemetry_exporter` before `:opentelemetry`, matching the official startup-order guidance.
- Added `:opentelemetry_cowboy` for PlugCowboy-based Phoenix services, because current `opentelemetry_phoenix` documentation says adapter instrumentation is needed for the full request lifecycle.
- Replaced the runtime `Application.put_env/3` setup module with `config/runtime.exs` configuration. The SDK/exporter read configuration when their OTP applications start, so setting those values inside `Application.start/2` is too late.
- Removed the invalid `plug OpentelemetryPhoenix` example. Current Phoenix instrumentation is installed by calling `OpentelemetryPhoenix.setup/1` and requires `Plug.Telemetry` in the endpoint.
- Moved Finch instrumentation setup into the application start callback with `OpentelemetryFinch.setup/0`.
- Corrected the Finch section wording from automatic context propagation to manual context propagation, since the example injects headers with `:otel_propagator_text_map.inject/1`.
- Removed an unused/nonexistent `OpenTelemetry.Propagator.TextMap` alias from the Finch client example.
- Corrected message queue context extraction. `:otel_propagator_text_map.extract/1` attaches context and returns a detach token, so the consumer example now uses `extract_to/2` to create a context, attaches it, and detaches it in an `after` block.
- Corrected the integration test trace ID extraction to use `Tracer.current_span_ctx()` with `OpenTelemetry.Span.hex_trace_id/1`.

## Review Notes
Elixir is not installed in this workspace, so the examples were not compiled locally. Validation was performed against official documentation and API references with manual syntax review.
