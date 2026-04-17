# Validation Summary: How to Use clickhouse-compressor Utility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- clickhouse-compressor (CLI utility)
- Compression codecs (LZ4, LZ4HC, ZSTD)
- ClickHouse Native format
- ClickHouse on-disk MergeTree column files (.bin)

## Sources Consulted
- Official ClickHouse docs: https://clickhouse.com/docs/operations/utilities/clickhouse-compressor
- Official ClickHouse docs: https://clickhouse.com/docs/interfaces/formats/Native
- ClickHouse `clickhouse-compressor --help` behavior (option set: `--decompress`, `--codec`, `--hc`, `--zstd`, `--none`, `--block-size`, `--stat`)

## Issues Found

1. **Inaccurate claim about Native format compression.**
   - The original section "Checking Native Format Blocks" stated that "ClickHouse Native format files are also compressed." This is not true in general — Native format output produced by `clickhouse-client ... FORMAT Native` is not compressed unless explicitly piped through a compressor. Renamed the section to "Compressing Native Format Exports" and rewrote the body to reflect the real workflow (compressing/decompressing a Native export).

2. **Non-functional verification command.**
   - The original example used `clickhouse-client --query "SELECT count() FORMAT Null" < export_raw.native`, but `SELECT` does not consume stdin like `INSERT ... FORMAT Native` does, so the command does not count rows from the file. Replaced the example with a correct compress/decompress round-trip, which is what the rewritten section demonstrates.

3. **Misleading section heading.**
   - The heading "Integration with clickhouse-obfuscator Pipeline" did not match the example, which only uses `clickhouse-compressor` and `ssh` (no `clickhouse-obfuscator`). Renamed it to "Compressed Data Transfer Pipeline" so the heading matches the content.

## Review Notes
- `--codec ZSTD\(3\)` and `--codec LZ4HC\(9\)` work because bash escapes the parentheses; the equivalent `--codec 'ZSTD(3)'` (single-quoted) is also valid and arguably more readable.
- `clickhouse-compressor` also supports convenience flags (`--zstd`, `--hc`, `--none`) and `--stat` for block statistics, which are not covered in the post but are within scope of the tool.
- The example path `/var/lib/clickhouse/data/<db>/<table>/<part>/<column>.bin` matches MergeTree's on-disk layout for non-wide vs. wide parts in current ClickHouse versions.
