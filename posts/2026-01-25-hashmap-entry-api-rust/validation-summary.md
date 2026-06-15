# Validation Summary: How to Do HashMap Lookup and Insert Without Double Lookup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rust
- `std::collections::HashMap`
- `std::collections::hash_map::Entry`
- `OccupiedEntry`

## Sources Consulted
- Rust standard library documentation for `HashMap`: https://doc.rust-lang.org/std/collections/struct.HashMap.html
- Rust standard library documentation for `Entry`: https://doc.rust-lang.org/std/collections/hash_map/enum.Entry.html
- Rust standard library documentation for `OccupiedEntry`: https://doc.rust-lang.org/std/collections/hash_map/struct.OccupiedEntry.html
- Local Rust compiler checks with `rustc 1.93.0`, using `rustc --edition=2021 --crate-type lib --emit=metadata` for each Rust code block

## Issues Found
- The naive word-count example claimed it could perform up to three hash lookups per word and labeled the insert path as a third lookup. Only two lookup operations happen on any single execution path: `contains_key` followed by either `get_mut` or `insert`. Updated the insert comment to "Second lookup: insert" and changed the explanation to "up to two hash lookups per word."

## Review Notes
- All 12 Rust code blocks type-checked successfully with `rustc --emit=metadata`.
- A full `rustdoc --test` run was attempted, but the environment's main filesystem was full and linking failed with "No space left on device." The metadata checks were run from `/dev/shm` to avoid that environment limitation.
- The `entry`, `or_insert`, `or_insert_with`, `or_insert_with_key`, `or_default`, `and_modify`, direct `Entry` matching, and `OccupiedEntry` method descriptions match the current Rust standard library documentation.
