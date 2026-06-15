# Validation Summary: How to Understand Explicit Lifetime Annotations in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Lifetime annotations
- Lifetime elision
- Borrow checker
- Generic lifetime bounds
- Higher-ranked trait bounds

## Sources Consulted
- The Rust Reference: Lifetime elision - https://doc.rust-lang.org/reference/lifetime-elision.html
- The Rust Reference: Trait and lifetime bounds - https://doc.rust-lang.org/reference/trait-bounds.html
- The Rust Programming Language: Validating References with Lifetimes - https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
- Rust By Example: Static - https://doc.rust-lang.org/rust-by-example/scope/lifetime/static_lifetime.html
- Local compiler check with rustc 1.93.0

## Issues Found
- The `'static` code block used `let s: &'static str = "hello";` at module scope, which is invalid Rust because `let` bindings cannot appear as module items. Moved the binding into `main` so the example compiles.
- The comment `Constants are 'static` introduced a `static GLOBAL` item, which was imprecise terminology. Changed it to `Static items have 'static lifetime`.
- The post described the static lifetime as "always explicit" in a context about elision. Because const and static reference declarations can have implicit `'static` lifetimes, narrowed the wording to `Static return lifetime - explicit` and updated the summary row accordingly.

## Review Notes
The remaining examples compile as standalone snippets when tested individually, and the lifetime elision, `'static`, lifetime-bound, and HRTB explanations match the official Rust documentation. Some generic lifetime bounds shown in the post are redundant because Rust can imply well-formedness bounds such as `T: 'a` from `&'a T`, but they are accepted by Rust and remain valid examples of explicit bounds.
