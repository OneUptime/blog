# Validation Summary: How to Use Pin and Unpin in Async Rust

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Rust
- Rust async/await
- `std::pin::Pin`
- `std::marker::Unpin`
- `std::pin::pin!`
- `std::future::Future`
- Tokio `select!`

## Sources Consulted
- Rust standard library `std::pin` module documentation: https://doc.rust-lang.org/std/pin/
- Rust standard library `std::pin::pin!` macro documentation: https://doc.rust-lang.org/std/pin/macro.pin.html
- Rust standard library `std::marker::Unpin` documentation: https://doc.rust-lang.org/std/marker/trait.Unpin.html
- Rust standard library `std::future::Future` documentation: https://doc.rust-lang.org/std/future/trait.Future.html
- Rust Reference await expression documentation: https://doc.rust-lang.org/reference/expressions/await-expr.html
- Tokio `select!` macro documentation: https://docs.rs/tokio/latest/tokio/macro.select.html

## Issues Found
- The post stated that moving a struct containing a raw pointer to its own data is undefined behavior. Moving such a struct creates a stale raw pointer, but the undefined behavior occurs when that invalid pointer is dereferenced. Updated the sentence to make that distinction.
- The post described the generated async state machine as holding `data` and a reference to it across an await point. Updated the wording to clarify that the state machine can hold `data` alongside an in-flight future or reference that borrows it, and that the problematic move is after the future has been pinned and polled.
- The post described `Pin<Box<T>>` as meaning the future will never move for its entire lifetime. Updated the wording to clarify that the pointee does not move while it remains pinned.
- The post used "stack pinning" as the main description for `std::pin::pin!`. The official documentation calls this local pinning and notes that locals in async contexts may live in the surrounding future's storage, which may be stack or heap allocated. Updated the wording to "local pinning" and clarified that the macro does not add a heap allocation.
- The post stated that Tokio `select!` requires pinned futures. `select!` can accept ordinary async expressions directly; pinning is needed in specific cases such as reusing a future by reference or working with `!Unpin` futures across polling. Updated the sentence to describe the example as using explicitly pinned futures.

## Review Notes
Code examples were checked for syntax against Rust 1.93.0 and Tokio 1.52.3 with the expected surrounding definitions. The examples compile. The `pin!` macro stabilization version, `Future::poll` signature, `Unpin` behavior, and `Pin` restrictions match current official documentation.
