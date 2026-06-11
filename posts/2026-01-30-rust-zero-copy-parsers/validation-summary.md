# Validation Summary: How to Create Zero-Copy Parsers in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (lifetimes, borrowing, `&str` slices)
- The `nom` parser combinator library (v7.1)
- `std::borrow::Cow` (Clone on Write)
- `criterion` crate for benchmarking
- `stats_alloc` crate for measuring allocations

## Sources Consulted
- nom 7.x documentation: https://docs.rs/nom/7.1/nom/
- nom `bytes::complete` module: https://docs.rs/nom/7.1/nom/bytes/complete/index.html
- nom `combinator` module (recognize, map_res, value, opt): https://docs.rs/nom/7.1/nom/combinator/index.html
- nom `error` module (VerboseError, context): https://docs.rs/nom/7.1/nom/error/index.html
- Rust Book — Lifetime Syntax: https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html
- `std::borrow::Cow` documentation: https://doc.rust-lang.org/std/borrow/enum.Cow.html
- `stats_alloc` crate documentation: https://docs.rs/stats_alloc/
- `criterion` crate documentation: https://docs.rs/criterion/

## Issues Found
- **`identifier` function in "Basic nom Combinators" was incorrect.** The code claimed to match the regex `[a-zA-Z_][a-zA-Z0-9_]*`, but it used `take_while1` for the second matcher, which requires at least one trailing alphanumeric character. As written, identifiers consisting only of letters/underscores (e.g., `"abc"`, `"_var"`) would fail to parse, contradicting the documented intent. Changed the second `take_while1` to `take_while` (which allows zero matches) and added `take_while` to the import list.

## Review Notes
- The `boolean_value` parser uses `tag("true")` / `tag("false")` directly. This will greedily match prefixes — for example, a hypothetical unquoted value `trueblue` would parse as boolean `true` with `blue` left over. Acceptable for an educational example, but a production parser would want a word-boundary check (e.g., wrapping with `terminated(tag("true"), peek(not(alphanumeric)))`).
- The `ws` helper uses `take_while1(...).or(Ok((input, "")))` to fall back to an empty match. A cleaner idiom would be `take_while(...)` (no `1`), but the current form is functionally correct.
- The post correctly notes that the simple zero-copy JSON `parse_string` does not handle escape sequences, and the "Handling Escape Sequences" section addresses this with `Cow<'a, str>` — a good pedagogical progression.
- The `stats_alloc` example matches the official upstream usage pattern, including the slightly unusual `Region::new(&GLOBAL)` (the global allocator is itself a reference, so the additional `&` produces `&&StatsAlloc<System>`, which works via deref).
- nom 7.1 is the most recent 7.x line at time of writing; nom 8 has been released with API changes (notably the move away from the `fn(input) -> IResult` parser-trait style toward the `Parser` trait in some areas). The post's signatures and combinators target nom 7.x specifically and are accurate for that version. Readers using nom 8 would need to adjust.
