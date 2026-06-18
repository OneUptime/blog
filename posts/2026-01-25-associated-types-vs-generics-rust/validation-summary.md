# Validation Summary: How to Choose Between Associated Types and Generics in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Traits
- Generic type parameters
- Associated types
- Standard library traits: `Iterator`, `From`, and `Add`

## Sources Consulted
- The Rust Programming Language, "Advanced Traits": https://doc.rust-lang.org/book/ch20-02-advanced-traits.html
- Rust Reference, "Associated items": https://doc.rust-lang.org/reference/items/associated-items.html
- Rust Reference, "Generic parameters": https://doc.rust-lang.org/reference/items/generics.html
- Rust standard library documentation for `std::iter::Iterator`: https://doc.rust-lang.org/std/iter/trait.Iterator.html
- Rust standard library documentation for `std::convert::From`: https://doc.rust-lang.org/std/convert/trait.From.html
- Rust standard library documentation for `std::ops::Add`: https://doc.rust-lang.org/std/ops/trait.Add.html
- Rust Unstable Book, `associated_type_defaults`: https://doc.rust-lang.org/beta/unstable-book/language-features/associated-type-defaults.html

## Issues Found
- The generic conversion example defined a local trait named `From<T>`, which conflicted with the standard prelude's `std::convert::From` when calling `UserId::from(...)`. I changed the example to implement `std::convert::From<T>` directly for `UserId`, which demonstrates the same generic-parameter concept and compiles correctly.
- The post claimed that associated types can have defaults and showed `type Output = String;` inside a trait. Associated type defaults are still unstable in Rust and require the nightly-only `associated_type_defaults` feature. I replaced this with a stable "Default Generic Parameters" example using `trait Builder<Output = String>`.

## Review Notes
All Rust code blocks were compiled with `rustc 1.93.0` using edition 2021. Snippets without `main` were checked as libraries. The remaining warnings are expected unused-code warnings in illustrative examples, not technical correctness issues.
