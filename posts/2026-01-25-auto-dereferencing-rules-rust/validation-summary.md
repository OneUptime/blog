# Validation Summary: How to Understand Auto-Dereferencing Rules in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Method call auto-dereferencing and auto-borrowing
- `Deref` and `DerefMut`
- Deref coercions
- References, smart pointers, and trait method resolution

## Sources Consulted
- Rust Reference: Method-call expressions - https://doc.rust-lang.org/reference/expressions/method-call-expr.html
- Rust Reference: Type coercions - https://doc.rust-lang.org/reference/type-coercions.html
- Rust standard library: `std::ops::Deref` - https://doc.rust-lang.org/std/ops/trait.Deref.html
- Rust standard library: `std::ops::DerefMut` - https://doc.rust-lang.org/std/ops/trait.DerefMut.html
- Rust standard library: primitive reference type - https://doc.rust-lang.org/std/primitive.reference.html
- Local compiler check with `rustc 1.93.0 (254b59607 2026-01-19)`

## Issues Found
- The method-resolution algorithm was oversimplified and did not accurately describe Rust's candidate receiver list. Updated it to match the Rust Reference: repeatedly dereference the receiver type, add `&T` and `&mut T` after each candidate, then search inherent and visible trait methods in order.
- The introductory explanation said the compiler inserts `*` operations for method lookup. Changed this to "dereference and borrow adjustments" because method-call lookup also considers automatic borrowing.
- The reference comparison example attributed `ra == rb` to auto-deref. Corrected the comment to state that `PartialEq` for references compares referenced values.
- The pattern-matching example said "use ref keyword" but the code dereferenced first instead. Corrected the prose comment.
- The smart-pointer chain example said `println!("{}", nested)` worked by finding `i32` methods. Corrected the comment because formatting works through `Box`'s `Display` implementation when the inner type implements `Display`.
- The Common Pitfalls code block used `Deref` without importing it, so the standalone snippet did not compile. Added `use std::ops::Deref;`.
- The Common Pitfalls example claimed `let slice: &str = r;` would error, but explicit `let` type annotations are coercion sites and the code compiles. Rewrote the example to distinguish inferred `&String` from an expected `&str` target type.

## Review Notes
All Rust code blocks were extracted and compiled independently with `rustc --edition=2021`. No remaining compile errors or warnings were found after the corrections.
