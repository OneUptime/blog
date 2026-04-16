# Validation Summary: How to Use INTO OUTFILE to Export ClickHouse Query Results

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (SELECT / INTO OUTFILE)
- `clickhouse-client` CLI
- Output formats: CSV, CSVWithNames, TabSeparated(WithNames), Parquet, JSONEachRow, Native
- Compression codecs: gzip, lz4, zstd, brotli, xz, deflate, bz2

## Sources Consulted
- ClickHouse official docs — INTO OUTFILE: https://clickhouse.com/docs/sql-reference/statements/select/into-outfile
- ClickHouse official docs — File table engine / `engine_file_truncate_on_insert`: https://clickhouse.com/docs/engines/table-engines/special/file
- ClickHouse source — `src/IO/CompressionMethod.cpp` (supported codec aliases)
- ClickHouse source — `src/Parsers/ParserQueryWithOutput.cpp` (clause ordering: INTO OUTFILE → COMPRESSION → FORMAT)

## Issues Found
1. **Server-side vs client-side file path (major).** The original post said `INTO OUTFILE` writes "to a file on the server" and that paths must be inside `user_files_path` (default `/var/lib/clickhouse/user_files/`). The ClickHouse docs explicitly state that `INTO OUTFILE` writes on the **client** side (wherever `clickhouse-client` / `clickhouse-local` is running) and is unavailable over the HTTP interface. The `user_files_path` restriction applies to the `file()` table function and `File` engine, not `INTO OUTFILE`. Rewrote the intro, removed the `user_files_path` paragraph, and changed all example paths from `/var/lib/clickhouse/user_files/...` to client-side paths under `/tmp/`.

2. **Clause ordering of COMPRESSION vs FORMAT (major).** Every compressed example had `FORMAT ... COMPRESSION ...`, but per the ClickHouse grammar (`ParserQueryWithOutput.cpp`) `COMPRESSION` is parsed inside the `INTO OUTFILE` clause and must appear **before** `FORMAT`. Swapped the order in all examples and added an explicit note about the ordering.

3. **`engine_file_truncate_on_insert` used for INTO OUTFILE (major).** The "Overwriting Existing Files" section used `SETTINGS engine_file_truncate_on_insert = 1` to overwrite the output file. That setting applies to the `File` table engine / `file()` table function, not to `INTO OUTFILE`. The correct mechanism is the `TRUNCATE` clause (part of the `INTO OUTFILE` syntax). Replaced the example accordingly and added a note that `APPEND` cannot be combined with compression.

4. **CLI section comment "server-side path" (minor).** The `clickhouse-client` example comment "Using INTO OUTFILE through clickhouse-client (server-side path)" was inconsistent with the documented behavior. Reworded to reflect that the file is written on the client machine.

5. **Compression codec list (minor).** Expanded/clarified the supported codec list to match what `CompressionMethod.cpp` actually accepts (`none`, `gzip`/`gz`, `deflate`, `brotli`/`br`, `xz`/`lzma`, `zstd`/`zst`, `lz4`, `bz2`), and added a sentence on auto-detection from the file extension and the optional `LEVEL` modifier.

6. **Summary section (minor).** Updated to reflect the corrected facts: client-side path, client/`clickhouse-local` only, and `TRUNCATE`/`APPEND` clauses (not `engine_file_truncate_on_insert`).

## Review Notes
- The post does not mention the `AND STDOUT` option that can follow the filename in `INTO OUTFILE`. Not an error, just an omission that could be worth adding in the future.
- `snappy` is also accepted by `CompressionMethod.cpp` but is not commonly used with `INTO OUTFILE`; intentionally omitted from the codec list to keep the guide focused.
- INTO OUTFILE cannot be used over the HTTP interface; this is now called out explicitly, which is important context for users trying it from a driver or REST client.
