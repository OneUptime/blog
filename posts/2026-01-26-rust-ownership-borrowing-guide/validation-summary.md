# Validation Summary: How to Use Rust Ownership and Borrowing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust ownership and move semantics
- Rust borrowing and mutable references
- Rust lifetimes
- Rust standard library types and traits: `String`, `Copy`, `HashMap`

## Sources Consulted
- The Rust Programming Language: What Is Ownership? https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html
- The Rust Programming Language: References and Borrowing https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
- The Rust Programming Language: Validating References with Lifetimes https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
- Rust standard library documentation: `std::marker::Copy` https://doc.rust-lang.org/std/marker/trait.Copy.html
- Rust standard library documentation: `String::len` https://doc.rust-lang.org/std/string/struct.String.html#method.len
- Rust standard library documentation: `HashMap` https://doc.rust-lang.org/std/collections/struct.HashMap.html

## Issues Found
- The borrowing example printed `String::len()` as a character count. `String::len()` returns the length in bytes, not characters, so the output text was changed from "characters" to "bytes".

## Review Notes
The Rust examples and explanations are otherwise technically accurate for current stable Rust. The `calculate_length(s: &String)` example is correct for teaching references, though `&str` is often preferred in production APIs when only string slice behavior is needed.
