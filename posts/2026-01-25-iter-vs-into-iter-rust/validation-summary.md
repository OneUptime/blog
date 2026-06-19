# Validation Summary: How to Use iter() vs into_iter() in Rust

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- Iterator trait
- IntoIterator trait
- Vec, slices, arrays, HashMap, and HashSet

## Sources Consulted
- Rust Standard Library documentation: `std::iter` module, including the three forms of iteration and `for` loop desugaring: https://doc.rust-lang.org/std/iter/
- Rust Standard Library documentation: `Iterator::filter`: https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.filter
- Rust Standard Library documentation: `Vec` IntoIterator implementations: https://doc.rust-lang.org/std/vec/struct.Vec.html
- Rust Standard Library documentation: `HashMap` IntoIterator implementations: https://doc.rust-lang.org/std/collections/struct.HashMap.html
- Rust Standard Library documentation: `HashSet` IntoIterator implementations: https://doc.rust-lang.org/std/collections/struct.HashSet.html
- Rust Edition Guide: IntoIterator for arrays: https://doc.rust-lang.org/edition-guide/rust-2021/IntoIterator-for-arrays.html

## Issues Found
- The iterator adapter example said "`iter()` + `map` returns references, need to clone for ownership." This was imprecise because `iter()` yields references, while `map()` returns whatever the closure produces. Updated the comment to say that `iter()` yields references and `map()` can produce values from borrowed items.
- The array example said "`into_iter()` on array yields `T` (since Rust 2021)" next to a `for n in arr` example. The Rust Edition Guide states that arrays implement `IntoIterator` in all editions starting with Rust 1.53, and only `.into_iter()` method-call syntax has the Rust 2021 edition-specific behavior. Updated the comment to say that iterating an array by value yields `T`.

## Review Notes
All Rust code blocks were compiled successfully with `rustc 1.93.0` using `--edition=2021`. The examples use current stable APIs and the ownership explanations match the official Rust documentation.
