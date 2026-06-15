# Validation Summary: How to Choose Between String and &str in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust standard library `String`
- Rust primitive `str` / `&str`
- Rust ownership and borrowing
- Rust `std::borrow::Cow`

## Sources Consulted
- Rust standard library documentation for `String`: https://doc.rust-lang.org/std/string/struct.String.html
- Rust standard library documentation for `str`: https://doc.rust-lang.org/std/primitive.str.html
- Rust standard library documentation for `Cow`: https://doc.rust-lang.org/std/borrow/enum.Cow.html
- Rust Reference, dynamically sized types: https://doc.rust-lang.org/reference/dynamically-sized-types.html
- The Rust Programming Language, deref coercion: https://doc.rust-lang.org/book/ch15-02-deref.html
- The Rust Programming Language, slices: https://doc.rust-lang.org/book/ch04-03-slices.html

## Issues Found
- The size table described `String` as "Dynamic, stored on heap", which could imply the `String` value itself has dynamic size. Updated it to clarify that `String` is a fixed-size handle with a dynamic heap buffer, while `&str` is a fixed-size reference to dynamically sized string data.
- The `size_of` comments hardcoded 24 bytes for `String` and 16 bytes for `&str` without noting target dependence. Updated the comments to say these values are for 64-bit targets.
- The `Cow<str>` return types compile, but current Rust warns that the hidden output lifetime is confusing when it is tied to the input `&str`. Updated those signatures to `Cow<'_, str>`.
- The performance example said `println!` "uses format!", but `println!` formats directly without creating an intermediate `String`. Updated the comment to describe the actual benefit.

## Review Notes
The corrected examples compile with Rust 1.93.0 using edition 2024. The post remains a beginner-oriented guide, so it intentionally omits advanced alternatives such as borrowed struct fields with explicit lifetimes, generic `AsRef<str>` parameters, and Unicode grapheme-boundary handling.
