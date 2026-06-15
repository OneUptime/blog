# Validation Summary: How to Fix 'Cannot borrow as mutable' Errors in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Rust borrow checker
- Rust mutable and immutable references
- Rust closures
- `HashMap` entry API
- `RefCell`

## Sources Consulted
- The Rust Programming Language: Variables and Mutability - https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html
- The Rust Programming Language: References and Borrowing - https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
- The Rust Programming Language: Storing Lists of Values with Vectors - https://doc.rust-lang.org/book/ch08-01-vectors.html
- The Rust Programming Language: Closures - https://doc.rust-lang.org/book/ch13-01-closures.html
- The Rust Programming Language: RefCell<T> and the Interior Mutability Pattern - https://doc.rust-lang.org/book/ch15-05-interior-mutability.html
- Rust standard library: `HashMap` - https://doc.rust-lang.org/std/collections/hash_map/struct.HashMap.html
- Rust standard library: `Entry` - https://doc.rust-lang.org/std/collections/hash_map/enum.Entry.html
- Rust standard library: slices and `split_at_mut` - https://doc.rust-lang.org/std/primitive.slice.html
- Rust standard library: `RefCell` - https://doc.rust-lang.org/std/cell/struct.RefCell.html

## Issues Found
- The first immutable scalar assignment example described `x += 1` as a "cannot borrow as mutable" error. Current Rust reports this as assignment to an immutable variable, so the comment was corrected.
- The mutable/immutable borrow explanation was too broad because Rust can allow non-overlapping borrows, including different struct fields. The statement was narrowed to overlapping borrows of the same data.
- The closure section said `counter` could not be used while the closure still exists. With current non-lexical lifetimes, `counter` can be read after the closure's last use, so the comment was corrected to focus on use before the closure's last use.
- The `HashMap` section labeled a `contains_key` / `insert` / `get_mut` sequence as a borrow conflict. That sequence compiles on current Rust, so it was relabeled as a verbose pattern and the entry API claim was narrowed to lookup-or-insert simplification.

## Review Notes
All Rust code blocks were compiled with `rustc 1.93.0`; the struct-only example was compiled as a library. No deprecated APIs were found.
