# Validation Summary: How to Trace Ecto Database Queries in Phoenix with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elixir
- Phoenix
- Ecto
- Postgrex
- OpenTelemetry for Erlang/Elixir
- opentelemetry_ecto
- opentelemetry_phoenix
- opentelemetry_cowboy

## Sources Consulted
- opentelemetry_ecto v1.2.0 HexDocs: https://hexdocs.pm/opentelemetry_ecto/OpentelemetryEcto.html
- opentelemetry_ecto v1.2.0 package source from Hex.pm: https://repo.hex.pm/tarballs/opentelemetry_ecto-1.2.0.tar
- Ecto.Repo telemetry events documentation: https://hexdocs.pm/ecto/Ecto.Repo.html#module-telemetry-events
- Ecto.Query documentation: https://hexdocs.pm/ecto/Ecto.Query.html
- OpentelemetryPhoenix v2.0.1 HexDocs: https://hexdocs.pm/opentelemetry_phoenix/OpentelemetryPhoenix.html
- OpenTelemetry Erlang/Elixir sampling documentation: https://opentelemetry.io/docs/languages/erlang/sampling/
- Hex.pm package metadata for postgrex and OpenTelemetry packages: https://hex.pm/packages/postgrex and https://hex.pm/orgs/opentelemetry

## Issues Found
- The dependency snippet used older package constraints for `postgrex` and `opentelemetry_phoenix`, and the Phoenix setup omitted `opentelemetry_cowboy` even though `adapter: :cowboy2` requires it for the full request lifecycle. Updated the dependency versions and added `:opentelemetry_cowboy.setup()`.
- The span naming pattern was inaccurate for `opentelemetry_ecto` v1.2.0. Updated it to the documented `<telemetry_prefix>.query:<source>` pattern.
- The listed span attributes included `db.operation`, `db.pool.size`, and `db.pool.checked_out`, which are not emitted by `opentelemetry_ecto` v1.2.0. Replaced them with attributes and timing names that the released package actually records.
- The customization example used unsupported `span_attributes` and dynamic metadata callback options. Replaced it with supported `additional_attributes` and `span_prefix` options.
- The SQL filtering example used an unsupported `sql_filter` option. Replaced it with the documented `db_statement: &sanitize_sql/1` form.
- The connection pool section claimed pool metrics were captured. Revised it to focus on the supported query queue timing attribute.
- The transaction example used deprecated `Repo.transaction/2` and a nonexistent `Repo.lock/2` pipeline. Updated it to use `Repo.transact/2` and Ecto query `lock: "FOR UPDATE"`.
- The sampler configuration showed only the root sampler. Expanded it to the documented parent-based sampler settings for sampled and unsampled local and remote parents.
- The complex Ecto query snippet used query macros without importing `Ecto.Query`. Added the import to make the snippet self-contained.

## Review Notes
The post is technically relevant and salvageable. The corrections align it with the current released `opentelemetry_ecto` v1.2.0 API, which still uses older database semantic attribute names; future versions of the instrumentation may adopt newer OpenTelemetry database semantic conventions.
