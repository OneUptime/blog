# Validation Summary: How to Build WebSocket Servers with Actix

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Rust (edition 2021)
- Actix actor framework (v0.13)
- actix-web (v4)
- actix-web-actors (v4) — WebSocket support via the actor model
- actix-rt (v2) — runtime
- serde / serde_json — message serialization
- uuid (v1) — per-connection session IDs
- log / env_logger — logging
- tokio — `signal::ctrl_c` for graceful shutdown
- websocat — CLI client used for testing

## Sources Consulted
- actix crate docs: https://docs.rs/actix/0.13
  - `Recipient<M>` bounds: https://docs.rs/actix/0.13/actix/struct.Recipient.html
  - `Message` trait + derive: https://docs.rs/actix/0.13/actix/trait.Message.html and https://docs.rs/actix/0.13/actix/derive.Message.html
  - `AsyncContext::run_interval`: https://docs.rs/actix/0.13/actix/trait.AsyncContext.html
  - `Addr` / `do_send` semantics: https://docs.rs/actix/0.13/actix/struct.Addr.html
- actix-web-actors docs: https://docs.rs/actix-web-actors/4/actix_web_actors/ws/
  - `ws::start` signature
  - `ws::Message`, `ws::ProtocolError`, `ws::WebsocketContext`
- tokio docs: https://docs.rs/tokio/latest/tokio/signal/fn.ctrl_c.html (signal feature flag)
- actix-web docs (v4): `HttpServer`, `App`, `web::Data`, `web::Payload`

## Issues Found
1. **`ServerMessage` was missing `actix::Message` impl.** The code uses `Recipient<ServerMessage>` and `addr.do_send(ServerMessage::...)`, both of which require `M: actix::Message`. The enum was declared only with `#[derive(Debug, Serialize, Clone)]`, so the code as written would not compile. Fix: added `use actix::prelude::*;` to `messages.rs` and added `#[derive(Message)]` plus `#[rtype(result = "()")]` to `ServerMessage`. Source: https://docs.rs/actix/0.13/actix/struct.Recipient.html.
2. **`LeaveRoom` handler had a borrow checker error.** Inside `if let Some(members) = self.rooms.get_mut(...)`, the code called `self.broadcast_to_room(...)` (which takes `&self`) while `members` was still a live `&mut` borrow into `self.rooms`, and then called `self.rooms.remove(...)` while `members` was still in scope. Fix: restructured to compute `should_remove` in a scoped `match` block so the mutable borrow on `self.rooms` ends before the `&self` method call and the subsequent `self.rooms.remove`.
3. **Missing `tokio` dependency in `Cargo.toml`.** The "Graceful Shutdown" section uses `tokio::signal::ctrl_c()`, which requires the `tokio` crate with the `signal` feature, but the listed dependencies omitted it. Fix: added `tokio = { version = "1", features = ["signal"] }` with a brief comment.

## Review Notes
- The `Disconnect` handler iterates `for (room_name, members) in &mut self.rooms` while reading `self.sessions` inside the loop. This relies on Rust's disjoint-field borrow handling and does compile on current Rust (2021 edition / NLL), so it was left as-is.
- The comment on the heartbeat constants says "Timeout should be > 2x heartbeat interval" while the configured values are exactly 2× (5s interval, 10s timeout). This is a stylistic inconsistency rather than a technical error and was not changed.
- `let _ = addr.do_send(...)` is used in several places. In actix 0.13, `Addr::do_send` and `Recipient::do_send` return `()`, so the `let _ =` is unnecessary but harmless; it was kept to preserve the author's style. If strict error handling is desired, `try_send` returns `Result<(), SendError<M>>`.
- The `Shutdown` handler uses `for (id, addr) in &self.sessions` where `id` is unused — produces an unused-variable warning, not a compile error; not changed.
- `actix-web-actors` uses the actor-based WebSocket API; the newer `actix-ws` crate offers an async/await-based alternative that some readers may prefer for new projects, but the actor approach shown here is fully supported.
- Heartbeat behaviour (`ctx.ping(b"")`, updating `last_heartbeat` on `Pong`/`Ping`/`Text` frames) matches the canonical actix-web examples repo pattern.
