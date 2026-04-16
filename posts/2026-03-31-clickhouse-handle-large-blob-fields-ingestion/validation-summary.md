# Validation Summary: How to Handle Large Blob Fields During ClickHouse Ingestion

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, CODEC compression, column-level TTL, CONSTRAINTs)
- ZSTD compression
- AWS S3 (object storage for large binaries)
- SQL (CREATE TABLE, ALTER TABLE, INSERT)

## Sources Consulted
- ClickHouse MergeTree docs (TTL behavior): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse CREATE TABLE / column codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse ALTER COLUMN syntax: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse String functions (substring): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- AWS CLI S3 reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
No technical issues found.

Specifically verified:
- `substring(raw_payload, 1, 1024)` — valid, 1-indexed, returns first 1024 bytes.
- `CONSTRAINT max_payload_size CHECK length(payload) <= 65536` — valid CREATE TABLE syntax; constraints run on INSERT.
- `String CODEC(ZSTD(3))` and `CODEC(ZSTD(9))` — valid; ZSTD levels are [1, 22] in ClickHouse.
- `ALTER TABLE ... MODIFY COLUMN raw_payload String TTL timestamp + INTERVAL 7 DAY` — valid syntax.
- Column-level TTL behavior: value resets to the type default (empty string for String with no DEFAULT). Row is not deleted. Claim in post is accurate.
- `aws s3 cp` command syntax is correct.

## Review Notes
- Constraints in ClickHouse only run on INSERT; they are not validated against existing rows when added later. The post uses the constraint at CREATE TABLE time, which is the intended use case, so this caveat does not affect correctness.
- If all values in a column expire via TTL within a part, ClickHouse may drop the column's file from disk, which is a nicer outcome than "set to empty string" suggests — the post's wording is still accurate at the row-value level.
- ZSTD level 9 is significantly more CPU-intensive than the default level 1; readers applying this to hot-path tables should benchmark.
- No version-specific caveats — all syntax used has been stable across recent ClickHouse releases.
