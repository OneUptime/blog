# Validation Summary: How to Fix 'Borrow checker' Issues in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Borrow checker
- Ownership and borrowing
- Non-lexical lifetimes
- `RefCell`
- `HashMap` Entry API
- `Option::take`
- `std::mem::replace` and `std::mem::take`

## Sources Consulted
- The Rust Programming Language, "References and Borrowing": https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
- Rust standard library documentation for `RefCell`: https://doc.rust-lang.org/std/cell/struct.RefCell.html
- Rust standard library documentation for `std::cell`: https://doc.rust-lang.org/std/cell/
- Rust standard library documentation for `HashMap` Entry: https://doc.rust-lang.org/std/collections/hash_map/enum.Entry.html
- Rust Edition Guide, "Match ergonomics reservations": https://doc.rust-lang.org/edition-guide/rust-2024/match-ergonomics.html
- Rust Reference, "Patterns": https://doc.rust-lang.org/reference/patterns.html

## Issues Found
- The `Working with Loops` example used `.filter(|(_, &item)| item == 3)`, which compiles under Rust 2021 but is rejected under Rust 2024 match ergonomics rules. Changed it to `.filter(|(_, item)| **item == 3)`, which compiles under both Rust 2021 and Rust 2024.

## Review Notes
- Verified the Rust code blocks with `rustdoc --edition=2021 --test` and `rustdoc --edition=2024 --test`; all 12 doctests pass under both editions after the fix.
