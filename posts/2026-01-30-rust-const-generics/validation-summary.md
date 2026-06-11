# Validation Summary: How to Create Const Generics in Rust

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Rust language (stable + brief mentions of nightly features)
- Const generics
- `MaybeUninit` (`std::mem`)
- Trait system with const generic parameters
- Array types and dimensional analysis pattern

## Sources Consulted
- Rust Reference, Generic parameters: https://doc.rust-lang.org/reference/items/generics.html
- Unstable Book, `generic_const_exprs`: https://doc.rust-lang.org/beta/unstable-book/language-features/generic-const-exprs.html
- Unstable Book, `adt_const_params`: https://doc.rust-lang.org/beta/unstable-book/language-features/adt-const-params.html
- Tracking issue #95174 (`adt_const_params`): https://github.com/rust-lang/rust/issues/95174
- Rust 1.59 release notes (const generic defaults): https://blog.rust-lang.org/2022/02/24/Rust-1.59.0/
- Rust 1.79 release notes (inline const expressions): https://blog.rust-lang.org/2024/06/13/Rust-1.79.0.html
- `std::mem::MaybeUninit` documentation: https://doc.rust-lang.org/std/mem/union.MaybeUninit.html
- Rustonomicon, unchecked uninit: https://doc.rust-lang.org/nomicon/unchecked-uninit.html
- Full Const Generics 2026 project goal: https://rust-lang.github.io/rust-project-goals/2026/const-generics.html

## Issues Found

1. **`max_array` used unstable `generic_const_exprs` syntax presented as stable.**
   The original code used `where [(); N - 1]:,` to "ensure N >= 1". This is a generic const expression and requires `#![feature(generic_const_exprs)]` (nightly only). The Limitations section later in the same post correctly says arithmetic on const generics is unstable, so the two sections contradicted each other. Rewrote `max_array` to return `Option<i32>` and check `N == 0` at runtime — works on stable. Updated the `main` call site to `.unwrap()`.

2. **`StaticBuffer::new()` declared `pub const fn` but called `T::default()`.**
   `Default::default()` is not a `const fn`, and calling trait methods on a generic `T` in a `const` context requires the unstable `const_trait_impl` feature. The function would not compile on stable. Removed the `const` keyword and added a one-line comment explaining why.

3. **`SmallVec::new()` used the older `MaybeUninit::uninit().assume_init()` array-init pattern.**
   While the std docs still show this pattern as technically sound for `[MaybeUninit<T>; N]`, the modern idiomatic form (stable since Rust 1.79) is `[const { MaybeUninit::uninit() }; N]`, which also doesn't rely on `T: Copy` for the array repeat-expression. Replaced the body and updated the comment.

4. **`Split` trait impl used `[T; N - SPLIT_AT]:` without flagging it.**
   That bound is a generic const expression and requires nightly. Added a `// Note:` comment above the impl explicitly stating the requirement, so a reader doesn't try this on stable.

5. **Unused import `use std::marker::PhantomData;` in the Quantity example.**
   `PhantomData` is never referenced in the snippet. Removed the import.

6. **Unused import `use std::time::Instant;` in the Performance example.**
   `Instant` is never referenced. Removed the import.

## Review Notes

- The `Default Const Values` example (`struct RingBuffer<T, const N: usize = 16>`) is correct — default values for const generic parameters were stabilized in Rust 1.59.0 (Feb 2022).
- The empty bound `where [T; N]:,` used in the `SmallVec` example is stable (it's just a well-formedness bound on a plain const generic parameter, not an arithmetic expression), so it was left alone.
- The Limitations table is accurate as of mid-2026: `&'static str`, structs/enums, and floats remain unstable as const generic parameter types (still gated behind `adt_const_params`, with no float support even on nightly). Integer types, `bool`, and `char` are stable.
- The `generic_const_exprs` feature is still nightly-only (active project work in 2026 around `min_generic_const_args` precedes any stabilization), so the post's note that arithmetic in const generics is limited on stable remains correct.
- The "No Specialization" section is correct — `min_specialization` is unstable and the post's workaround (runtime branching on `N`) is the right pattern for stable Rust.
- The dimensional-analysis example using `i32` const parameters is a valid (and idiomatic) demonstration of using signed integer const parameters.
