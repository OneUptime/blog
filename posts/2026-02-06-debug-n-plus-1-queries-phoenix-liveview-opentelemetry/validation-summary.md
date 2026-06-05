# Validation Summary: How to Debug N+1 Queries in Phoenix LiveView with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elixir
- Phoenix LiveView
- Ecto
- Telemetry
- OpenTelemetry
- opentelemetry_ecto
- PostgreSQL query tracing concepts

## Sources Consulted
- Ecto association and preload documentation: https://hexdocs.pm/ecto/Ecto.html
- Ecto.Association.NotLoaded documentation: https://hexdocs.pm/ecto/Ecto.Association.NotLoaded.html
- Ecto.Repo preload documentation: https://hexdocs.pm/ecto/Ecto.Repo.html#preload/3
- Ecto.Query documentation: https://hexdocs.pm/ecto/Ecto.Query.html
- Phoenix LiveView lifecycle hooks and async assigns documentation: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html
- Telemetry attach/attach_many handler documentation: https://hexdocs.pm/telemetry/telemetry.html
- OpenTelemetry.Tracer documentation for `with_span` and attributes: https://hexdocs.pm/opentelemetry_api/OpenTelemetry.Tracer.html
- opentelemetry_ecto documentation: https://hexdocs.pm/opentelemetry_ecto/OpentelemetryEcto.html
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/

## Issues Found
- The post claimed that accessing `post.author.name` on an unloaded Ecto association triggers a query per post. Ecto does not lazy-load associations; unloaded associations contain `%Ecto.Association.NotLoaded{}`. Updated the examples to show a real N+1 pattern through per-row helper/context queries and then rendering preloaded associations after the fix.
- The LiveView tracing macro attempted to override `mount/3` and call `super/3` in a way that would not automatically wrap user-defined LiveView callbacks. Replaced it with an explicit tracing helper for `mount/3` and kept event tracing as an explicit wrapper.
- The nested-association section used direct unloaded association access and had an inconsistent "4 queries" statement while listing five queries. Updated the example to use helper calls for the N+1 case and corrected the fixed query count to five.
- The OpenTelemetry Ecto span section implied SQL statements are always present. `opentelemetry_ecto` disables `:db_statement` by default, so the text now notes that SQL statements must be enabled or sanitized explicitly.
- The development N+1 detector attempted to store updated query state by returning a new map from a Telemetry handler. Telemetry handler return values are ignored. Updated the snippet to store query patterns in the current process dictionary and reset them on endpoint stop.
- The aggregation example used `select: %{p | comment_count: count(c.id)}`, which only works if `comment_count` is a schema field, usually virtual. Replaced it with a map result and added the required `import Ecto.Query`.

## Review Notes
The article is technically valid after correction. Future improvements could mention that `assign_async/3` assigns `Phoenix.LiveView.AsyncResult` values and that query spans from parallel Ecto preloads may depend on instrumentation context propagation.
