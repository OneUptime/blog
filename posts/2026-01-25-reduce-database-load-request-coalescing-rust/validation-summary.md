# Validation Summary: How to Reduce Database Load with Request Coalescing in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Tokio asynchronous runtime
- Tokio broadcast channels
- Tokio timeouts
- SQLx PostgreSQL queries
- Request coalescing / single-flight request deduplication

## Sources Consulted
- Tokio `broadcast` module documentation: https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html
- Tokio `broadcast::Receiver` documentation: https://docs.rs/tokio/latest/tokio/sync/broadcast/struct.Receiver.html
- Tokio `time::timeout` documentation: https://docs.rs/tokio/latest/tokio/time/fn.timeout.html
- SQLx `query_as!` macro documentation: https://docs.rs/sqlx/latest/sqlx/macro.query_as.html
- SQLx `QueryAs::fetch_one` documentation: https://docs.rs/sqlx/latest/sqlx/query/struct.QueryAs.html
- Rust standard library `Mutex` documentation: https://doc.rust-lang.org/std/sync/struct.Mutex.html

## Issues Found
- The original coalescer only broadcast successful values. Waiting requests did not receive the original error; they saw the broadcast channel close and then retried, which could cause duplicate database queries during failure cases. I changed the in-flight channel to broadcast `Result<Arc<V>, E>` so both successes and errors are shared.
- The original timeout example wrapped `self.coalescer.execute(...)` in `tokio::time::timeout`, but the coalescer did not clean up its `in_flight` map if the leader future was canceled. Tokio documents that `timeout` cancels the wrapped future by dropping it, so a timed-out leader could leave a stale sender in the map. I added a cleanup guard backed by `std::sync::Mutex` so the key is removed when the leader future completes or is dropped.
- The original retry path after a closed broadcast channel did not re-check the map in a loop before inserting a new sender, allowing a retrying request to overwrite a newer in-flight request for the same key. I changed the code to loop after a closed channel and only become the leader if the key is still absent.
- The original snippet imported `tokio::sync::broadcast::Receiver` but never used it. I removed the unused import while updating the coalescer.
- The service example used `Coalescer<i64, User>` after the corrected coalescer needed to carry the error type. I updated it to `Coalescer<i64, User, Error>`.

## Review Notes
The SQLx snippets are illustrative and assume the surrounding application defines `User`, `Error`, and an `Error::Timeout` variant, and that `Error` implements `Clone` for the coalescer. SQLx `query_as!` remains current, but it requires SQLx macros and compile-time database metadata or an appropriate offline setup in a real project.
