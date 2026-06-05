# Validation Summary: How to Trace Diesel and SeaORM Queries with OpenTelemetry in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- OpenTelemetry
- tracing and tracing-subscriber
- tracing-opentelemetry
- Diesel
- diesel-tracing
- r2d2
- SeaORM
- SQLx statement logging
- PostgreSQL

## Sources Consulted
- Diesel associations documentation: https://docs.diesel.rs/2.1.x/diesel/associations/index.html
- Diesel joinable macro documentation: https://docs.rs/diesel/latest/diesel/macro.joinable.html
- diesel-tracing crate documentation and feature notes: https://docs.rs/diesel-tracing
- OpenTelemetry OTLP Rust exporter documentation: https://docs.rs/opentelemetry-otlp/latest/opentelemetry_otlp/
- tracing-opentelemetry documentation and OTLP example: https://docs.rs/tracing-opentelemetry/latest/tracing_opentelemetry/
- opentelemetry_sdk Resource documentation: https://docs.rs/opentelemetry_sdk/latest/opentelemetry_sdk/resource/struct.Resource.html
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry database attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- SeaORM database connection and ConnectOptions documentation: https://www.sea-ql.org/SeaORM/docs/install-and-config/connection/
- SeaORM ConnectOptions API documentation: https://docs.rs/sea-orm/latest/sea_orm/struct.ConnectOptions.html

## Issues Found
- The dependency snippets used outdated OpenTelemetry and ORM versions. Updated the OpenTelemetry crates to the current 0.32 line, tracing-opentelemetry to 0.33, Diesel to 2.3, diesel-tracing to 0.4, and SeaORM to 1.1.
- The Diesel snippet included `diesel-tracing` but did not use it. Updated the pool and query examples to use `diesel_tracing::pg::InstrumentedPgConnection`, and enabled the required `postgres` and `r2d2` features.
- The OpenTelemetry initialization used the removed `new_pipeline()` / `new_exporter().tonic()` API from older opentelemetry-otlp releases. Replaced it with `SpanExporter::builder().with_tonic()` and `SdkTracerProvider::builder()`.
- The examples used older database semantic convention attributes such as `db.system`, `db.operation`, and `db.sql.table`. Updated them to `db.system.name`, `db.operation.name`, and `db.collection.name`.
- The resource example used the older `deployment.environment` attribute. Updated it to `deployment.environment.name` via `opentelemetry-semantic-conventions`.
- The Diesel schema macros were unqualified. Updated them to `diesel::table!`, `diesel::joinable!`, and `diesel::allow_tables_to_appear_in_same_query!`.
- The `Post` model used `Associations` without `Identifiable`, which differs from Diesel's documented association pattern. Added `Identifiable`.
- The SeaORM dependency snippet omitted `chrono` and `log`, even though later snippets used `chrono::Utc` and `log::LevelFilter`. Added both dependencies.
- Several SeaORM snippets omitted imports needed for the shown methods and macros, including `DatabaseConnection`, `DbErr`, `ActiveModelTrait`, `ConnectionTrait`, and `instrument`. Added the missing imports.
- The SeaORM text overstated automatic tracing. Reworded it to describe SQLx statement logging flowing through the tracing subscriber.
- The connection-pool monitoring section claimed SeaORM exposes pool metrics through the underlying SQLx pool, but the example only performs ping-based health checks. Removed the inaccurate claim.
- The article claimed SQL statements and row metadata are captured generally. Reworded the claim and architecture label to avoid implying statement capture is automatic or always safe.

## Review Notes
The code examples are still tutorial snippets rather than a single complete crate, so they were reviewed against official APIs and crate documentation rather than compiled as one standalone project. SQL statement capture remains a privacy-sensitive opt-in concern; the updated post now calls that out explicitly.
