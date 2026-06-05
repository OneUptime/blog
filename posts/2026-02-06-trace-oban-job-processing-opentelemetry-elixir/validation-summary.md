# Validation Summary: How to Trace Oban Job Processing with OpenTelemetry in Elixir

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elixir
- Oban
- OpenTelemetry Erlang/Elixir
- OpenTelemetry OTLP exporter
- Telemetry
- Ecto

## Sources Consulted
- Oban current API documentation: https://hexdocs.pm/oban/Oban.html
- Oban current Telemetry documentation: https://hexdocs.pm/oban/Oban.Telemetry.html
- Oban v2.15.4 documentation: https://hexdocs.pm/oban/2.15.4/Oban.html
- Oban Testing documentation: https://hexdocs.pm/oban/Oban.Testing.html
- OpenTelemetry Erlang/Elixir instrumentation documentation: https://opentelemetry.io/docs/languages/erlang/instrumentation/
- OpenTelemetry Erlang/Elixir propagation documentation: https://opentelemetry.io/docs/languages/erlang/propagation/
- OpenTelemetry Erlang/Elixir resources documentation: https://opentelemetry.io/docs/languages/erlang/resources/
- OpenTelemetry API HexDocs for `OpenTelemetry.Tracer`: https://opentelemetry-api.hexdocs.pm/OpenTelemetry.Tracer.html
- OpenTelemetry API HexDocs for `OpenTelemetry.Ctx`: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Ctx.html
- OpenTelemetry exporter HexDocs: https://hexdocs.pm/opentelemetry_exporter/opentelemetry_exporter.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post described Oban as having built-in observability through a dashboard. Oban exposes telemetry events directly, while dashboard functionality is optional through Oban Web/Pro, so I clarified that wording.
- The OpenTelemetry resource configuration used `config :opentelemetry, :resource` with a keyword structure. Current official Erlang/Elixir docs show the `resource:` application environment with nested maps, so I updated the snippet to `config :opentelemetry, resource: %{service: %{...}}`.
- The enqueue event used a `DateTime` struct as an OpenTelemetry event attribute value. OpenTelemetry attributes should use primitive values or lists of primitive values, so I converted `scheduled_at` to an ISO 8601 string.
- The base traced worker attached extracted context without detaching it. The OpenTelemetry context API documents matching `attach/1` and `detach/1`, so I wrapped the span execution in `try/after` and detached the token.
- The base worker used `error.__struct__` as an attribute value. That is an atom/module value rather than a stable primitive attribute value, so I changed it to a formatted exception string.
- The reusable worker macros declared `execute/1` without a body before marking it overridable. I replaced that with a default implementation that raises, which gives workers a concrete overridable function and a clear error if they forget to implement it.
- The child job example handled `Oban.insert_all/1` as if it returned `{:ok, jobs}` or `{:error, reason}`. Official Oban docs state that `insert_all` returns a list of jobs and raises on insert errors, so I updated the example to use the returned list and rescue errors.
- The telemetry handler attached to `[:oban, :circuit, :trip]` and `[:oban, :circuit, :open]`. Current Oban telemetry docs no longer list those circuit events, so I removed them from the event list and removed the corresponding handlers.
- The sampled worker example also attached extracted context without detaching it. I added matching `detach/1` handling there as well.

## Review Notes
The post is validated after corrections. The examples remain tutorial-oriented and include application-specific placeholders such as `EmailProvider`, `UUID`, `MyApp.Repo`, and worker modules; those are acceptable as illustrative stubs but would need real project implementations.
