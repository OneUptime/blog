# Validation Summary: How ClickHouse Primary Index Works Internally

## Status
validated

## Post Type
Technical deep dive / Internals explanation

## Technologies Covered
- ClickHouse (MergeTree engine)
- Sparse primary index (`primary.idx`)
- Mark files (`.mrk` / `.mrk2` / `.mrk3`)
- Adaptive index granularity
- Data skipping indices

## Sources Consulted
- ClickHouse official documentation on primary indexes: https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse official documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on `system.settings`: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse source code conventions for mark file formats and part storage formats

## Issues Found

### Issue 1: Incorrect mark file extension (`.mrk3` → `.mrk2`)
- **What was wrong:** The post referenced `.mrk3` as the mark file extension. `.mrk3` is specifically used for compact parts (where all columns are stored in a single `data.bin` file). For wide parts with adaptive granularity — which is the default configuration and the most common scenario for larger tables — the mark file extension is `.mrk2`.
- **What was changed:** Replaced `.mrk3` with `.mrk2` and added a note that this is used with the default adaptive granularity.
- **Why:** Wide parts with `.mrk2` files are the standard format readers will encounter in practice. Using `.mrk3` could cause confusion when readers inspect their own ClickHouse data directories.

### Issue 2: Incorrect reference to `data.bin` (compact-part-only file)
- **What was wrong:** The post referenced `data.bin` as the data file in both the binary search section and the mark files section. `data.bin` only exists in compact parts (small parts where all columns are stored together). In wide parts (the default for parts larger than ~10 MB), each column has its own `.bin` file (e.g., `user_id.bin`, `event_time.bin`).
- **What was changed:** Replaced `data.bin` with "column data files" in the binary search section, and with a concrete example (`user_id.bin`) in the mark files section and its accompanying illustration.
- **Why:** Since the post discusses large-scale MergeTree behavior (mentioning petabyte scale in the summary), wide parts are the relevant format. Referencing `data.bin` could mislead readers about ClickHouse's columnar storage layout.

## Review Notes
- The mark file offset description is simplified — in reality, mark files store two offsets per entry: the offset of the compressed block in the file, and the offset within the decompressed block. This is an acceptable simplification for a conceptual blog post.
- The post describes fixed 8192-row granules in early sections, then introduces adaptive granularity later. With adaptive granularity enabled (the default), 8192 is the maximum rows per granule, not a fixed size. The post does cover this nuance in the "Adaptive Granularity" section, so no change was needed.
- The `pread` reference is accurate — ClickHouse does use positioned read system calls to seek directly to offsets in column files.
- All SQL examples are syntactically correct and use current ClickHouse syntax.
- The system table queries (`system.parts`, `system.settings`) reference correct column names and table structures.
