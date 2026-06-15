# Validation Summary: How to Return Reference to Local Variable in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Rust ownership and borrowing
- Rust lifetimes
- `std::borrow::Cow`
- `Box<T>` and boxed slices

## Sources Consulted
- The Rust Programming Language, "Validating References with Lifetimes": https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
- The Rust Programming Language, "What Is Ownership?": https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html
- The Rust Reference, "Literal expressions": https://doc.rust-lang.org/reference/expressions/literal-expr.html
- Rust standard library documentation for `std::borrow::Cow`: https://doc.rust-lang.org/std/borrow/enum.Cow.html
- Rust standard library documentation for `std::boxed`: https://doc.rust-lang.org/std/boxed/index.html
- Rust standard library documentation for `Vec::into_boxed_slice`: https://doc.rust-lang.org/std/vec/struct.Vec.html
- Local verification with `rustc 1.93.0`

## Issues Found
- The opening non-compiling example returned `&str` without a lifetime parameter, which makes current Rust report `E0106` before the intended `E0515` dangling-reference diagnostic. Changed the return type to `&'static str` and updated the shown error line so the example matches the actual compiler error.
- The explanation said `greeting` was allocated on the stack. A `String` local value owns a heap buffer, and returning a reference is invalid because the `String` is dropped and frees that buffer when the function returns. Updated the explanation to distinguish the local `String` value from its heap allocation.
- The `Cow` examples used `Cow<str>`, which compiles but triggers Rust's current `mismatched_lifetime_syntaxes` warning. Updated the return types to `Cow<'_, str>`.
- The `Box::new([0u8; 1_000_000])` example implied the large array is allocated directly on the heap. `Box<T>` provides heap allocation, but constructing a large array argument can still involve a large temporary before boxing. Replaced it with `vec![0u8; size].into_boxed_slice()` for a runtime-sized heap buffer.

## Review Notes
All remaining examples are syntactically valid and use stable Rust APIs. The `find_word` example is correct for ASCII input like the sample text; a production implementation that accepts arbitrary UTF-8 search strings should be careful to slice only on valid character boundaries.
