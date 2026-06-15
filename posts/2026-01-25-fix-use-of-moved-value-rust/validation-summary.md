# Validation Summary: How to Fix 'Use of moved value' Errors in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust ownership and move semantics
- Rust borrowing and references
- Rust `Copy` and `Clone` traits
- Rust iterators
- Rust closures
- Rust `Option`

## Sources Consulted
- The Rust Programming Language: What is Ownership? https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html
- The Rust Programming Language: References and Borrowing https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
- Rust standard library documentation: `Copy` https://doc.rust-lang.org/std/marker/trait.Copy.html
- Rust standard library documentation: `Clone` https://doc.rust-lang.org/std/clone/trait.Clone.html
- The Rust Programming Language: Processing a Series of Items with Iterators https://doc.rust-lang.org/book/ch13-02-iterators.html
- The Rust Reference: Closure expressions https://doc.rust-lang.org/reference/expressions/closure-expr.html
- Rust standard library documentation: `Option` https://doc.rust-lang.org/std/option/enum.Option.html
- Local compiler verification with `rustc 1.93.0 (254b59607 2026-01-19)`

## Issues Found
- The sample E0382 diagnostic used `use of moved value` and `value used here after move` for a `println!("{}", s1)` example. Current Rust reports `borrow of moved value` and `value borrowed here after move` because `println!` formats by borrowing its argument. Updated the diagnostic text to match current compiler output while preserving the post's explanation of the move error.

## Review Notes
All 11 runnable Rust code examples compile successfully with `rustc 1.93.0` using the 2024 edition. The ownership, borrowing, `Copy`, `Clone`, iterator, closure, and `Option` explanations are consistent with the official Rust documentation. One future improvement would be to mention that `clone()` does not always mean a deep copy for every type, although the `String` example shown in the post is accurate.
