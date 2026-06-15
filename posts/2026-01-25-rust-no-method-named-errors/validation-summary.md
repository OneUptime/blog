# Validation Summary: How to Fix 'No method named X found' Errors in Rust

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Rust
- Rust traits and method resolution
- Rust standard library (`std::io::Read`, `String`, iterators, slices, `Deref`)
- Cargo dependency feature flags
- Tokio feature flags

## Sources Consulted
- Rust Reference: Method-call expressions - https://doc.rust-lang.org/reference/expressions/method-call-expr.html
- Rust Standard Library: `std::io::Read` - https://doc.rust-lang.org/std/io/trait.Read.html
- Rust Standard Library: `std::iter::ExactSizeIterator` - https://doc.rust-lang.org/std/iter/trait.ExactSizeIterator.html
- Rust Standard Library: `Vec<T>` - https://doc.rust-lang.org/std/vec/struct.Vec.html
- Rust Standard Library: `String::into_bytes` - https://doc.rust-lang.org/std/string/struct.String.html#method.into_bytes
- Tokio crate documentation: Feature flags - https://docs.rs/tokio/latest/tokio/#feature-flags
- Tokio crate documentation: `#[tokio::main]` - https://docs.rs/tokio/latest/tokio/attr.main.html

## Issues Found
- The introduction overstated trait import requirements. Rust method lookup considers visible traits, including traits in scope, traits in the prelude, and trait bounds. Updated the wording to match the Rust Reference.
- The first example described `Vec::iter()` as inherent to `Vec`. In the standard library docs, `iter` appears under methods from `Deref<Target = [T]>`. Updated the comment to say `Vec` derefs to a slice.
- The missing `Read` import example placed the solution import in the same module as the problem code, which would make the trait visible module-wide if the commented call were enabled. Split the problem and solution into separate code blocks and added an explicit `Vec<u8>` type for the commented problem snippet.
- The wrong-type example claimed iterators do not have `len()`, but some iterators, including slice iterators, implement `ExactSizeIterator::len`. Updated the example to use `filter()`, where the returned iterator does not provide `len()`, and clarified that `Iterator` itself does not provide `len()`.
- The `String::into_bytes` example described the reference call as a method-not-found error. The method exists, but it takes `self`, so calling it through `&String` fails because it would move out of a shared reference. Updated the comment accordingly.
- The clone example's comment implied `s2` was moved even though `s2.clone().into_bytes()` consumes the clone. Updated the output line and comment to show that using `s2` afterward is valid.
- The Tokio macro comment said `#[tokio::main]` requires `macros` and `rt-multi-thread`. Tokio documents the macro as available with `rt` and `macros`, while the default multi-threaded runtime requires `rt-multi-thread`. Updated the comment to mention a runtime feature such as `rt-multi-thread`.
- The trait implementation example placed the `impl Greetable for Person` in the same module as the commented failing call, so the method would be available if uncommented. Split the problem and solution into separate code blocks.
- The `debug_type` example borrowed an iterator from a temporary vector, causing a temporary-value lifetime error. Added a binding for the vector before calling `.iter()`.

## Review Notes
Standalone Rust code blocks were compiled with `rustc 1.93.0` where practical. The Tokio snippet was not compiled locally because it requires an external dependency setup, but its feature requirements were checked against the official Tokio documentation.
