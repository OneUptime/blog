# Validation Summary: How to Fix 'Mismatched types' Errors in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust type system
- Rust standard library conversions
- Rust error handling with `Option` and `Result`
- Rust closures, tuples, arrays, vectors, slices, and references

## Sources Consulted
- Rust Reference: Closure expressions - https://doc.rust-lang.org/reference/expressions/closure-expr.html
- Rust Reference: Closure types - https://doc.rust-lang.org/reference/types/closure.html
- Rust Reference: Type coercions - https://doc.rust-lang.org/reference/type-coercions.html
- Rust Reference: Statements and type inference - https://doc.rust-lang.org/reference/statements.html
- Rust Reference: Method call expressions - https://doc.rust-lang.org/reference/expressions/method-call-expr.html
- Rust Standard Library: `TryInto` - https://doc.rust-lang.org/std/convert/trait.TryInto.html
- Rust Standard Library: `From` and `Into` - https://doc.rust-lang.org/std/convert/trait.From.html and https://doc.rust-lang.org/std/convert/trait.Into.html
- Rust Standard Library: `Option` - https://doc.rust-lang.org/std/option/enum.Option.html
- Rust Standard Library: `Result` - https://doc.rust-lang.org/std/result/enum.Result.html
- Rust RFC 1558: Closure to `fn` coercion - https://rust-lang.github.io/rfcs/1558-closure-to-fn-coercion.html

## Issues Found
- The closure type mismatch example used unannotated closures (`|x| x + 1`) that failed with an inference error before demonstrating the intended distinct-closure-type mismatch. Added `i32` parameter annotations to make the surrounding example compile while preserving the intended explanation.
- The tuple example accessed `tuple.1`, moving the `String`, and then attempted to destructure the same partially moved tuple. Added a fresh tuple before the destructuring example.
- The `collect` example was labeled "Error with collect" even though the shown code is a valid fix with a target type annotation. Updated the comment to say it is a fix.

## Review Notes
Validated examples with `rustc 1.93.0 (254b59607 2026-01-19)`. Full examples compile after the fixes; the return-type section was checked as a library-style snippet, and the final conversion summary was checked wrapped in `fn main()`.
