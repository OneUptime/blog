# Validation Summary: How to Use input_format_allow_errors_ratio in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (server settings, format settings)
- ClickHouse SQL (`INSERT ... SELECT`, `SETTINGS` clause, `SET`)
- ClickHouse table functions (`file()`, `url()`)
- ClickHouse system tables (`system.query_log`)
- CSV / text format ingestion

## Sources Consulted
- ClickHouse format settings reference: https://clickhouse.com/docs/operations/settings/formats (entries for `input_format_allow_errors_num` and `input_format_allow_errors_ratio`)
- ClickHouse source code: `src/Processors/Formats/IRowInputFormat.cpp` on GitHub (the actual error-threshold check)
- ClickHouse `system.query_log` reference: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse `file` and `url` table function references on clickhouse.com/docs

## Issues Found
1. **Incorrect interaction between the two settings (AND vs OR).** The original post stated that the import "aborts when either is exceeded" and that "whichever limit is hit first triggers an abort." Both the official ClickHouse documentation and the source code (`IRowInputFormat.cpp`) show that the exception is only thrown when **both** `input_format_allow_errors_num` *and* `input_format_allow_errors_ratio` are exceeded simultaneously (logical AND, not OR). Fixed the wording in three places:
   - The "What is" section now states that the import aborts only when both limits are exceeded.
   - The "Basic Usage" follow-up paragraph now describes the AND semantics and notes that the higher threshold becomes the effective limit.
   - The "Combining" section's worked example was rewritten: with 10,000 rows, ratio=0.02, num=50, the effective tolerance is up to 200 bad rows (the higher of the two thresholds), not "more than 200 or 50, whichever comes first."

## Review Notes
- The default value of `0` for both settings is correctly stated. With both at `0`, the AND condition is satisfied immediately on any error (`num_errors > 0` and `num_errors > total_rows * 0`), so the post's claim that "any parse error causes an immediate abort" by default remains correct.
- The SQL examples (`INSERT ... SELECT FROM file(...)`, `INSERT ... SELECT FROM url(...)`, `SET ...`, and the `system.query_log` query) all use valid, current ClickHouse syntax and column names (`query_id`, `read_rows`, `written_rows`, `result_rows`, `exception`, `event_time`, `type`).
- Calling the setting "session-level" is slightly narrow - it is a format setting that can be applied at server, profile, session, or query level - but the post also demonstrates the per-query `SETTINGS` form, so this is not technically misleading.
- `system.query_log` does not directly expose a "skipped rows" counter; the post correctly suggests using it to compare `read_rows` vs. `written_rows` rather than claiming a dedicated field exists. For richer error diagnostics users may also consult `system.text_log`, but that is out of scope for this post.
- The ratio check has a small implementation nuance (it only meaningfully kicks in once enough rows have been read that the ratio is well-defined), which is not covered here. Acceptable omission for an introductory tutorial.
