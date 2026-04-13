# Validation Summary: How to Build a REST API with MongoDB and Rust (Actix)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Actix-Web 4
- MongoDB Rust driver 2.x
- bson 2.x (with chrono-0_4 feature)
- serde / serde_json
- chrono 0.4
- dotenvy
- futures (TryStreamExt for cursor iteration)
- tokio

## Sources Consulted
- MongoDB Rust driver source and docs (https://docs.rs/mongodb/latest/mongodb/)
- MongoDB Rust driver GitHub Cargo.toml for feature flags (https://github.com/mongodb/mongo-rust-driver)
- bson crate source for ObjectId::parse_str and chrono-0_4 feature (https://docs.rs/bson/latest/bson/)
- IndexModel and IndexOptions typed-builder API (https://docs.rs/mongodb/latest/mongodb/struct.IndexModel.html)
- Actix-Web 4 documentation for web::Data, routing, and handler patterns (https://docs.rs/actix-web/4/actix_web/)

## Issues Found

1. **Missing `futures` dependency in Cargo.toml**: The `list_users` handler uses `futures::TryStreamExt` to iterate the MongoDB cursor, but the `futures` crate was not listed in the `[dependencies]` section of `Cargo.toml`. This would cause a compilation error. The `mongodb` crate depends on `futures-core` internally but does not re-export stream traits — its own documentation instructs users to add `futures` explicitly. **Fix:** Added `futures = "0.3"` to the dependencies.

2. **Unused import `UpdateUserRequest` in handlers.rs**: The `UpdateUserRequest` struct was imported in the handlers module but never used — the blog post defines only list, get, create, and delete handlers with no update handler. This would produce a compiler warning. **Fix:** Removed `UpdateUserRequest` from the import statement.

## Review Notes
- The `tokio-runtime` feature specified on the `mongodb` dependency is enabled by default in mongodb 2.x, so it is technically redundant. However, being explicit is acceptable for a tutorial and not incorrect.
- The `UpdateUserRequest` struct is still defined in models.rs but unused. This is fine as a forward-looking placeholder, but readers should be aware no update endpoint is implemented.
- The duplicate-key error detection (`e.to_string().contains("E11000")`) is fragile but the summary correctly explains this limitation. A more robust approach would inspect the structured error kind, but for a tutorial this is acceptable.
- The post targets mongodb driver version 2.x. Version 3.x has a different API surface (e.g., method signatures changed, options passing differs). Readers using mongodb driver 3.x will need to adapt the code.
