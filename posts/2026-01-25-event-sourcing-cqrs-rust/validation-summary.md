# Validation Summary: How to Build Event-Sourced Apps with CQRS in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Event Sourcing
- CQRS
- Domain-Driven Design aggregates
- chrono
- serde
- uuid
- thiserror
- std::sync::RwLock and std::sync::Mutex

## Sources Consulted
- Rust standard library documentation for RwLock: https://doc.rust-lang.org/std/sync/struct.RwLock.html
- Rust standard library documentation for Mutex: https://doc.rust-lang.org/std/sync/struct.Mutex.html
- uuid crate documentation: https://docs.rs/uuid
- chrono crate documentation: https://docs.rs/chrono
- serde derive documentation: https://serde.rs/derive.html
- thiserror crate documentation: https://docs.rs/thiserror
- Microsoft Azure Architecture Center, CQRS pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- Microsoft Azure Architecture Center, Event Sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- Martin Fowler, Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- Martin Fowler, CQRS: https://martinfowler.com/bliki/CQRS.html

## Issues Found
- The original `OpenAccount` command generated a fresh UUID inside the aggregate while the repository stored events under the caller-provided aggregate ID. This meant the read model inserted the account summary under one ID, then later deposit and withdrawal events updated using a different ID, causing the usage example's `get_summary(account_id).unwrap()` to fail. Updated `OpenAccount` to carry the aggregate ID and use it in the `AccountOpened` event.
- The aggregate allowed `Deposit`, `Withdraw`, and `CloseAccount` commands before an account had been opened. Added an `AccountNotOpened` error and checks for unopened aggregate state.
- The post overstated Rust's compile-time guarantees by saying the compiler catches invalid business state transitions. Revised the wording to say Rust makes commands, events, and errors explicit, while aggregate logic validates state transitions.

## Review Notes
The combined Rust examples were compiled and run with current compatible versions of the referenced crates. The usage example printed the expected balance of 1300, total deposits of 1500, and transaction count of 3.
