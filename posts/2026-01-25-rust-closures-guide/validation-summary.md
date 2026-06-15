# Validation Summary: How to Use Closures in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust closures
- Rust closure capture modes
- Rust `Fn`, `FnMut`, and `FnOnce` traits
- Rust iterators
- Rust trait objects and generics
- Rust standard library threads

## Sources Consulted
- The Rust Programming Language, Chapter 13.1: Closures: https://doc.rust-lang.org/book/ch13-01-closures.html
- The Rust Reference, Closure expressions: https://doc.rust-lang.org/reference/expressions/closure-expr.html
- Rust standard library documentation for `std::ops::Fn`: https://doc.rust-lang.org/std/ops/trait.Fn.html
- Rust standard library documentation for `std::thread::spawn`: https://doc.rust-lang.org/std/thread/fn.spawn.html
- Rust standard library documentation for `Iterator`: https://doc.rust-lang.org/std/iter/trait.Iterator.html

## Issues Found
- The original "Capturing by Value (FnOnce)" section implied that using `move` makes a closure `FnOnce`. This is not always true: `move` changes how values are captured, while the `Fn` trait implemented by a closure depends on how the closure body uses captured values. I changed the section title to "Capturing by Value (move)" and clarified that a `move` closure is only limited to `FnOnce` if it moves captured values out of its body when called.
- The `move` example only called `print_data()` once, which reinforced the incorrect implication that the closure could only be called once. I added a second call because the example closure only reads the moved vector and can be called multiple times.
- The Fn trait comments described the traits as directly defining capture mode. I revised the wording to explain that the traits define how closures can be called based on how they use captured values.
- The thread example comment said threads require a `'static` lifetime. I narrowed this to `thread::spawn`, whose closure argument is bounded by `FnOnce() -> T + Send + 'static`.

## Review Notes
- All Rust code blocks were checked with `rustdoc --test --edition 2021` after the changes, and all 12 tests passed.
