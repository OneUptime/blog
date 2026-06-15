# Validation Summary: How to Fix 'Method exists but trait bounds not satisfied' Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust traits and trait bounds
- Rust generics
- Rust standard library collections and iterator APIs
- Rust formatting traits

## Sources Consulted
- Rust standard library documentation: `Iterator::max` and `Iterator::min` require `Self::Item: Ord`: https://doc.rust-lang.org/std/iter/trait.Iterator.html
- Rust standard library documentation: slice `sort` requires `T: Ord`: https://doc.rust-lang.org/std/primitive.slice.html#method.sort
- Rust standard library documentation: `HashSet` requires elements to implement `Eq` and `Hash`: https://doc.rust-lang.org/std/collections/struct.HashSet.html
- Rust standard library documentation: `Ord` is a supertrait of `Eq` and `PartialOrd`, and implementations must be consistent: https://doc.rust-lang.org/std/cmp/trait.Ord.html
- Rust standard library documentation: `Display` provides formatting for `{}`: https://doc.rust-lang.org/std/fmt/trait.Display.html
- Rust standard library documentation: `Default` trait and `Default::default()`: https://doc.rust-lang.org/std/default/trait.Default.html
- The Rust Programming Language, Appendix C, derivable traits: https://doc.rust-lang.org/book/appendix-03-derivable-traits.html

## Issues Found
- The manual `Ord` implementation for `Point` compared only distance from the origin, while `PartialEq` compared both coordinates. This could make two different points with the same squared distance compare equal under `Ord` even though `PartialEq` considered them unequal. Updated the `cmp` implementation to compare distance first, then use `x` and `y` as tie-breakers so the ordering is consistent with equality.

## Review Notes
- The executable Rust examples were checked with `rustc 1.93.0` using edition 2021. They compiled successfully after the `Ord` consistency fix, aside from expected warnings for intentionally unused demonstration types and variables.
- Two code blocks are explanatory fragments rather than standalone programs: the compiler error excerpt and the derive macro example without a `main` function.
