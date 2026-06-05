# Validation Summary: How to Instrument Phoenix LiveView User Interactions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Erlang/Elixir API
- Phoenix LiveView
- Phoenix LiveView JavaScript hooks and bindings
- Phoenix LiveView telemetry events
- Elixir
- HEEx templates
- npm

## Sources Consulted
- Phoenix LiveView JavaScript interoperability documentation: https://phoenix-live-view.hexdocs.pm/js-interop.html
- Phoenix LiveView bindings documentation: https://phoenix-live-view.hexdocs.pm/bindings.html
- Phoenix LiveView telemetry documentation: https://hexdocs.pm/phoenix_live_view/telemetry.html
- OpenTelemetry JavaScript WebTracerProvider API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- OpenTelemetry JavaScript TracerConfig API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-web.TracerConfig.html
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Erlang/Elixir instrumentation documentation: https://opentelemetry.io/docs/languages/erlang/instrumentation/

## Issues Found
- The JavaScript setup used `provider.addSpanProcessor(...)`, but the current OpenTelemetry JS `WebTracerProvider` API configures processors through the `spanProcessors` constructor option. Updated the provider setup accordingly.
- The JavaScript setup passed a plain object as `resource`. Current OpenTelemetry JS expects a `Resource`; updated the example to use `resourceFromAttributes`.
- The npm install command omitted direct dependencies used by the code. Added `@opentelemetry/sdk-trace-base` and `@opentelemetry/resources`.
- The LiveSocket metadata example only added click metadata, while later server examples read `client_timestamp` from form submit/change payloads. Added `submit` and `change` metadata callbacks.
- The form template referenced `phx-hook="TracedInput"` without defining a matching hook. Removed the undefined hook reference.
- The performance section described custom metrics while the code creates spans from telemetry events. Updated the wording to describe spans for performance analysis.
- Phoenix LiveView telemetry durations are emitted in native time units, but the code labelled them as microseconds. Added `System.convert_time_unit(..., :native, :microsecond)` before setting `liveview.duration_us`.
- Some examples accessed `socket.assigns.live_action` directly, which can raise if the assign is absent. Updated those reads to `socket.assigns[:live_action]`.

## Review Notes
The post is technically valid as a guided example, but production implementations should also consider browser CORS configuration for OTLP/HTTP export, sampling, PII-safe span attributes, and explicit context propagation if client spans must be parented to server spans rather than merely correlated by metadata.
