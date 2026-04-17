# Validation Summary: How to Export ClickHouse Data to JSON Files

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (JSON, JSONEachRow, JSONCompact, JSONEachRowWithProgress formats)
- clickhouse-client CLI
- ClickHouse HTTP interface (port 8123, X-ClickHouse-User / X-ClickHouse-Key headers)
- ClickHouse `s3` table function (INSERT INTO FUNCTION)
- Python `clickhouse-driver` library (`execute_iter`)

## Sources Consulted
- ClickHouse JSONEachRowWithProgress format: https://clickhouse.com/docs/en/interfaces/formats/JSONEachRowWithProgress
- ClickHouse JSON format: https://clickhouse.com/docs/en/interfaces/formats/JSON
- ClickHouse JSONCompact format: https://clickhouse.com/docs/en/interfaces/formats/JSONCompact
- ClickHouse CLI: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse HTTP interface: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse s3 table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- clickhouse-driver (Python) README and API

## Issues Found

1. **Incorrect stderr redirection for `JSONEachRowWithProgress`**
   - The original example used `2>progress.log` to imply progress events were written to stderr. In reality, `JSONEachRowWithProgress` writes progress events inline in stdout as `{"progress":{...}}` objects, interleaved with `{"row":{...}}` data rows.
   - Fixed by removing the stderr redirect and adding a short sentence explaining that progress events are emitted inline in the output stream.

2. **Python `execute_iter` produces tuples, not dicts**
   - The original script called `json.dumps(row)` on rows returned from `execute_iter`, which yields tuples. The serialized output would be JSON arrays (e.g., `[1, "foo"]`), not JSON objects as implied by "events.ndjson" / JSONEachRow-style output. It would also fail on non-serializable types like `datetime`.
   - Fixed by using `with_column_types=True`, consuming the first yielded element (column `(name, type)` list) to obtain column names, zipping each subsequent row into a dict, and passing `default=str` to `json.dumps` to handle datetime/UUID/Decimal values. The import was also moved out of the loop.

## Review Notes
- The S3 `INSERT INTO FUNCTION` example uses inline AWS credentials, which is acceptable for documentation but not recommended in production — IAM roles or named credentials should be preferred. Not a technical error, so left unchanged.
- The section header "Exporting with Specific Column Types" does not match the JSONEachRowWithProgress content beneath it, but this is a content/structure concern rather than a technical inaccuracy — left unchanged per review scope.
- The `JSON` output structure example correctly shows `meta`, `data`, and `rows`; in practice ClickHouse also emits `rows_before_limit_at_least` (when `LIMIT` is used) and `statistics`. The post uses ellipses, so the shown structure is a valid subset.
