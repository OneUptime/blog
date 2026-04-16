# Validation Summary: How to Use ClickHouse with Stitch Data

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse (s3 table function, ReplacingMergeTree, FINAL modifier)
- Stitch Data (Import API v2)
- Python (requests library)
- AWS S3 (as staging layer)
- SQL / JSON Schema

## Sources Consulted
- Stitch Import API documentation: https://www.stitchdata.com/docs/developers/import-api
- Stitch Import API v2 batch endpoint reference: https://www.stitchdata.com/docs/developers/import-api/api
- ClickHouse s3 table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse SELECT FINAL: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier

## Issues Found
No technical issues found.

- Stitch Import API endpoint `POST https://api.stitchdata.com/v2/import/batch` with Bearer auth and JSON Content-Type is correct.
- Payload fields (`table_name`, `schema`, `messages` with `action`/`sequence`/`data`, `key_names`) match the documented Import API schema, and `upsert` is a valid action value.
- JSON Schema typing (`["null", "string"]`, `"format": "date-time"`) is valid Stitch/JSON-Schema usage.
- ClickHouse `s3(url, aws_key, aws_secret, format)` 4-arg signature is correct and `JSONEachRow` is a valid format name.
- `ReplacingMergeTree(updated_at) ORDER BY id` correctly uses `updated_at` as the version column for deduplication.
- `SELECT ... FROM table FINAL WHERE ...` is valid ClickHouse syntax.

## Review Notes
- The Python example imports `clickhouse_connect` and `pandas` and defines `CLIENT_ID` but does not use them in `push_to_stitch`. Harmless cruft, not technically incorrect; the imports would be relevant in a fuller pipeline that also writes/reads from ClickHouse.
- The incremental-load query assumes the source columns (including `updated_at`) are exposed by the `s3()` call with matching names and types; readers may need to add an explicit structure argument if schema inference is incomplete.
- Stitch is owned by Qlik (as of 2024) after previously being part of Talend. Saying "now part of Talend" is historically accurate but slightly dated; not corrected since it is not strictly wrong and is tangential to the technical content.
- Consider noting `OPTIMIZE TABLE ... FINAL` or `SELECT ... FINAL` trade-offs for very large deduplicated tables, but this is an enhancement, not a correction.
