# Validation Summary: How to Create Global Mutable Singletons in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- `std::sync::OnceLock`
- `std::sync::Mutex`
- `std::sync::RwLock`
- `std::sync::atomic`
- `lazy_static`
- `once_cell`

## Sources Consulted
- Rust standard library documentation for `std::sync::OnceLock`: https://doc.rust-lang.org/std/sync/struct.OnceLock.html
- Rust 1.70.0 release announcement for `OnceCell` and `OnceLock` stabilization: https://blog.rust-lang.org/2023/06/01/Rust-1.70.0/
- Rust standard library documentation for `std::sync::Mutex` and poisoning: https://doc.rust-lang.org/std/sync/struct.Mutex.html
- Rust standard library documentation for `std::sync::RwLock`: https://doc.rust-lang.org/std/sync/struct.RwLock.html
- Rust standard library documentation for atomic memory orderings: https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html
- Rust 2024 Edition Guide for `static mut` references: https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html
- `lazy_static` crate documentation: https://docs.rs/lazy_static
- `once_cell` crate documentation: https://docs.rs/once_cell

## Issues Found
- The introductory `static mut` example said it would not compile. The code does compile when the mutation is inside an `unsafe` block, but it is unsafe and can cause undefined behavior if used without proper synchronization. Updated the wording to describe the actual compiler behavior.
- The `once_cell` description said `OnceCell` is for single-threaded contexts. The crate provides both `unsync::OnceCell` for single-threaded contexts and `sync::OnceCell` for thread-safe initialization. Updated the description to distinguish them.
- The cache TTL checks used `now - entry.created_at`, which can underflow if the system clock moves backward. Updated the checks to use `saturating_sub`.
- The lock poisoning example imported `PoisonError` without using it. Removed the unused import.

## Review Notes
All Rust code blocks were compiled with `cargo check` using Rust 1.93.0, `lazy_static` 1.5.0, and `once_cell` 1.21.4. The snippets compile successfully; warnings are limited to unused items because examples are presented independently.
