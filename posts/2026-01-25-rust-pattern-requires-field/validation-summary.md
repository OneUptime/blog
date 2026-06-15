# Validation Summary: How to Fix 'Pattern requires field' Errors in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust struct patterns
- Rust enum variant patterns
- Rust match expressions
- Rust destructuring and binding modes

## Sources Consulted
- Rust Reference: Patterns - https://doc.rust-lang.org/reference/patterns.html
- Rust Error Code E0027 - https://doc.rust-lang.org/error_codes/E0027.html
- Rust 2024 Edition Guide: Match ergonomics reservations - https://doc.rust-lang.org/edition-guide/rust-2024/match-ergonomics.html
- Local compiler verification with `rustc 1.93.0`

## Issues Found
- The "Use Underscore for Unused Fields" section described prefixing field bindings with an underscore, but the code used the `_` wildcard. Updated the wording and summary bullet to describe `_` as a wildcard for unused fields.
- The `ref` / `ref mut` example used `let Data { ref value, ref mut count } = data;` where `data` is `&mut Data`. This compiles in Rust 2021 but is rejected in Rust 2024 because explicit binding modes are not allowed inside an implicitly borrowing pattern. Updated it to `let Data { value, count } = data;`, which works under both Rust 2021 and Rust 2024 while still borrowing the fields through match ergonomics.

## Review Notes
All Rust examples were extracted and compiled with `rustc --edition=2021` and `rustc --edition=2024`. The intentionally partial function examples were checked as library code. Remaining compiler output consisted of expected unused-code warnings in tutorial snippets.
