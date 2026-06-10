# Validation Summary: How to Build REST APIs with Actix-web in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (edition 2021)
- Actix-web 4 (HTTP server, routing macros, extractors, `App::wrap_fn`, scopes, testing)
- actix-cors (CORS middleware)
- Serde / serde_json (serialization)
- Tokio (async runtime, transitively via actix-rt)
- uuid (v4 generation with serde feature)
- chrono (timestamps with serde feature)
- env_logger / log (structured logging)

## Sources Consulted
- Actix-web docs: https://docs.rs/actix-web/latest/actix_web/
- `App::wrap_fn` reference: https://docs.rs/actix-web/latest/actix_web/struct.App.html
- `web::scope` reference: https://docs.rs/actix-web/latest/actix_web/web/fn.scope.html
- Test module: https://docs.rs/actix-web/latest/actix_web/test/index.html
- `#[actix_web::test]` macro: https://docs.rs/actix-web/latest/actix_web/attr.test.html
- actix-cors crate: https://docs.rs/actix-cors/latest/actix_cors/
- Actix-web official guide: https://actix.rs/docs/

## Issues Found
1. **Outdated `actix-cors` version.** The post recommended `actix-cors = "0.6"`. The current standard for actix-web 4 is `0.7.x`. Updated the dependency line to `actix-cors = "0.7"`. The CORS builder API (`Cors::default().allow_any_origin().allowed_methods(...).allowed_headers(...).max_age(...)`) shown in the post is identical between 0.6 and 0.7, so no other changes were required.

2. **Double `/tasks` path in the scoping example.** The original code nested `web::scope("/tasks")` inside `web::scope("/api/v1")` and then registered handlers whose attribute macros already include `/tasks` (e.g., `#[get("/tasks")]`, `#[get("/tasks/{id}")]`). Scope prefixes are prepended cumulatively, so endpoints would actually have resolved to `/api/v1/tasks/tasks` and `/api/v1/tasks/tasks/{id}`, contradicting the surrounding prose ("Your endpoints now live at `/api/v1/tasks`"). Removed the inner `web::scope("/tasks")` so handlers register directly under the `/api/v1` scope and the documented paths match.

## Review Notes
- `env_logger = "0.10"` is one minor version behind (current is `0.11`) but is fully functional with the example code; left as-is to avoid unnecessary churn.
- The `tokio` dependency is not strictly required because `#[actix_web::main]` brings up the actix-rt runtime, but declaring it is harmless and may be useful if the reader pulls in tokio APIs directly.
- The `Mutex<HashMap<...>>` in-memory store works for the tutorial but is intentionally simplistic; the post correctly flags that production code should use a real database/connection pool.
- The `wrap_fn` example, Serde derives, UUID v4 generation, `web::Path`/`web::Json`/`web::Query` extractors, `ResponseError` implementation, and the `test::init_service` / `test::call_and_read_body_json` integration test all match the current actix-web 4 APIs.
