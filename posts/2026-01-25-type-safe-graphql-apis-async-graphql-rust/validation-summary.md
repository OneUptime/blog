# Validation Summary: How to Build Type-Safe GraphQL APIs with async-graphql in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- GraphQL
- async-graphql
- async-graphql-actix-web
- Actix Web
- Tokio
- tokio-stream
- futures-util

## Sources Consulted
- async-graphql crate documentation: https://docs.rs/async-graphql/
- async-graphql Actix Web integration guide: https://async-graphql.github.io/async-graphql/en/integrations_to_actix_web.html
- async-graphql subscriptions guide: https://async-graphql.github.io/async-graphql/en/subscription.html
- async-graphql DataLoader documentation: https://docs.rs/async-graphql/latest/async_graphql/dataloader/
- async-graphql InputObject documentation: https://docs.rs/async-graphql/latest/async_graphql/derive.InputObject.html
- tokio-stream BroadcastStream documentation: https://docs.rs/tokio-stream/latest/tokio_stream/wrappers/struct.BroadcastStream.html
- GraphQL validation overview: https://graphql.org/learn/validation/

## Issues Found
- The dependency snippet used `async-graphql = "7.0"` but the post later imports `async_graphql::dataloader`, which is behind async-graphql's `dataloader` feature. Updated the dependency to enable `features = ["dataloader"]`.
- The subscription snippet imports `BroadcastStream`, which requires the `tokio-stream` crate with its `sync` feature. Added `tokio-stream = { version = "0.1", features = ["sync"] }` to the dependency snippet.
- The subscription snippet uses `filter_map` on a stream but did not import `StreamExt`, and `futures-util` was missing from the dependency snippet. Added `futures-util = "0.3"` and imported `StreamExt`.
- The subscription snippet passed a synchronous closure to `futures_util::StreamExt::filter_map`. Updated it to return an async block, matching the current futures-util API.
- The post claimed "Invalid queries fail at compile time, not runtime." This is inaccurate for incoming GraphQL documents, which are validated against the schema before execution. Revised the wording to say resolver type mismatches fail at compile time and incoming GraphQL operations are validated before execution.

## Review Notes
The examples intentionally rely on placeholder application types such as `Database`, `EventBus`, `UserEvent`, `RoleGuard`, and `Stats`; those are acceptable for a focused tutorial but would need definitions in a fully compilable sample project. The HTTP example uses `EmptySubscription`, so it demonstrates query and mutation HTTP wiring rather than WebSocket subscription wiring.
