# Validation Summary: How to Build a REST API with Actix Web

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Actix Web 4
- Tokio
- SQLx with PostgreSQL
- Serde and JSON extractors
- Actix Web middleware
- sqlx-cli migrations
- curl

## Sources Consulted
- Actix Web Getting Started: https://actix.rs/docs/getting-started/
- Actix Web Application documentation: https://actix.rs/docs/application/
- Actix Web Requests documentation: https://actix.rs/docs/request/
- Actix Web Middleware documentation: https://actix.rs/docs/middleware/
- Actix Web `EitherBody` API docs: https://docs.rs/actix-web/latest/actix_web/body/enum.EitherBody.html
- Actix Web `ServiceResponse` API docs: https://docs.rs/actix-web/latest/actix_web/dev/struct.ServiceResponse.html
- Actix Web runtime API docs: https://docs.rs/actix-web/latest/actix_web/rt/struct.Runtime.html
- SQLx CLI README: https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md
- SQLx `query_as` API docs: https://docs.rs/sqlx/latest/sqlx/fn.query_as.html

## Issues Found
- The middleware snippet imported `futures::future`, but `Cargo.toml` did not declare the `futures` crate. I changed the snippet to use `futures-util` and added `futures-util = "0.3"` to the dependencies, matching Actix Web's middleware documentation examples.
- The custom API key middleware returned an early `HttpResponse` with a boxed body while declaring `ServiceResponse<Bd>` as its response type. In Actix Web 4, middleware that can return either the inner service body or its own early response should use `EitherBody` and map inner responses with `map_into_left_body()` and early responses with `map_into_right_body()`. I updated the middleware snippet accordingly.
- The middleware usage snippet referenced `crate::middleware::ApiKeyAuth` but did not show `mod middleware;` in `main.rs`. I added that module declaration to the usage snippet.

## Review Notes
The SQLx commands are correct when `DATABASE_URL` is provided through the environment or a `.env` file. The dependency versions are not the newest available releases, but the APIs used in the article remain valid for the specified Actix Web 4 and SQLx 0.7 style.
