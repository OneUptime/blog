# Validation Summary: How to Understand Non-Lexical Lifetimes in Rust

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Rust
- Rust borrow checker
- Non-Lexical Lifetimes (NLL)
- Rust standard library types: `Vec`, `HashMap`, `Option`, `RefCell`

## Sources Consulted
- Rust RFC 2094: Non-lexical lifetimes: https://rust-lang.github.io/rfcs/2094-nll.html
- Rust Blog: Non-lexical lifetimes (NLL) fully stable: https://blog.rust-lang.org/2022/08/05/nll-by-default/
- Rust standard library documentation for `HashMap`: https://doc.rust-lang.org/std/collections/struct.HashMap.html
- Rust standard library documentation for `Vec`: https://doc.rust-lang.org/std/vec/struct.Vec.html
- Rust standard library documentation for `Option`: https://doc.rust-lang.org/std/option/enum.Option.html
- Rust standard library documentation for `RefCell`: https://doc.rust-lang.org/std/cell/struct.RefCell.html
- Local compiler check with `rustc 1.93.0 (254b59607 2026-01-19)`

## Issues Found
- The introduction and problem statement overstated pre-NLL behavior by saying lifetimes generally extended to the end of the lexical scope. RFC 2094 explains that pre-NLL lifetimes were already flexible for some expression-local borrows, but references stored in variables commonly caused scope-sized lifetime inference. Updated the wording to make that distinction accurate.
- The `Database::get_or_compute` example did not compile because returning `cached` from the cache-hit branch requires the borrow of `self.cache` to live for the returned reference lifetime, so assigning to `self.cache` later is rejected. Reworked the cache check to use `self.cache.as_ref().is_some_and(...)` and then borrow again only on the returning path.
- The limitations example implied explicit scoping could allow mutating a vector before later using a reference into it. That is not valid Rust because the reference would still be used after the mutation. Updated the example to show the failing pattern as comments and use an index instead of keeping the reference alive.

## Review Notes
The Rust examples were compile-checked together with `rustc --edition=2021`. The post mentions NLL as introduced in Rust 2018, which is accurate for Rust 2018 code; the Rust blog further notes that NLL became the default for all Rust code in Rust 1.63.
