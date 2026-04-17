# Validation Summary: How to Understand Delete Masks in ClickHouse

## Status
validated

## Post Type
Tutorial / Internals explainer

## Technologies Covered
- ClickHouse (MergeTree engine)
- Lightweight DELETE
- `_row_exists` virtual/hidden column
- `system.parts` system table
- `OPTIMIZE TABLE ... FINAL`

## Sources Consulted
- ClickHouse official documentation: The Lightweight DELETE Statement — https://clickhouse.com/docs/sql-reference/statements/delete
- ClickHouse blog: Handling Updates and Deletes in ClickHouse — https://clickhouse.com/blog/handling-updates-and-deletes-in-clickhouse
- ClickHouse documentation on `system.parts` — https://clickhouse.com/docs/operations/system-tables/parts

## Issues Found
- **Inverted bit semantics for `_row_exists`.** The original line read: "a set bit means the row is logically deleted." This is reversed. In ClickHouse, `_row_exists` stores `True`/`1` for visible (existing) rows and `False`/`0` for lightweight-deleted rows. The post itself was internally inconsistent — a later section correctly stated "Rows with a 0 bit are excluded from the result set." I corrected the "What Is a Delete Mask?" section to read: "a set bit (1) means the row still exists, and a cleared bit (0) means the row is logically deleted." This matches the official documentation and the post's own later description.

## Review Notes
- The exact on-disk filename `_row_exists.bin` is consistent with ClickHouse's standard column storage convention (each column in a Wide part is stored as `<column>.bin`), but is not explicitly documented as a public API. Readers should treat it as an implementation detail subject to change.
- The post compares "Delete Mask" vs. "Mutation" as distinct mechanisms. Strictly speaking, lightweight DELETE is itself implemented internally as a special mutation that writes the `_row_exists` mask, but the high-level distinction between lightweight deletes (immediate read-side masking) and traditional `ALTER TABLE ... DELETE` mutations (full part rewrites) is correct and useful for readers.
- `has_lightweight_delete` in `system.parts` was added in ClickHouse 22.8+. Users on older versions may not have this column.
- `OPTIMIZE TABLE ... FINAL` is a heavy operation and should be used judiciously on large tables; the post could mention this caveat in a future revision but the technical correctness is fine.
