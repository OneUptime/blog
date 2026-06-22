# Validation Summary: How to Load CSV, JSON, and Parquet Files into ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- CSV, TSV, JSONEachRow, JSONCompactEachRow, JSONStringsEachRow, JSONAsObject
- Parquet and ORC
- ClickHouse `file`, `url`, and `s3` table functions
- ClickHouse S3 and URL table engines
- ClickHouse format and import settings

## Sources Consulted
- ClickHouse file table function: https://clickhouse.com/docs/sql-reference/table-functions/file
- ClickHouse url table function: https://clickhouse.com/docs/sql-reference/table-functions/url
- ClickHouse s3 table function: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse S3 table engine: https://clickhouse.com/docs/engines/table-engines/integrations/s3
- ClickHouse S3 integration guide: https://clickhouse.com/docs/integrations/s3
- ClickHouse CSV/TSV import guide: https://clickhouse.com/docs/integrations/data-formats/csv-tsv
- ClickHouse JSON formats and settings: https://clickhouse.com/docs/interfaces/formats/JSON/format-settings
- ClickHouse JSONCompactEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONCompactEachRow
- ClickHouse JSONStringsEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONStringsEachRow
- ClickHouse JSONAsObject format: https://clickhouse.com/docs/interfaces/formats/JSONAsObject
- ClickHouse JSONAsString format: https://clickhouse.com/docs/interfaces/formats/JSONAsString
- ClickHouse JSON functions: https://clickhouse.com/docs/sql-reference/functions/json-functions
- ClickHouse Parquet format: https://clickhouse.com/docs/interfaces/formats/Parquet
- ClickHouse URL table engine: https://clickhouse.com/docs/engines/table-engines/special/url

## Issues Found
- The CSV, JSON, and Parquet schema inspection examples used `DESCRIBE file(...)`. Updated them to `DESCRIBE TABLE file(...)`, matching ClickHouse's documented `DESCRIBE TABLE` syntax for table expressions.
- The CSV schema creation example omitted an engine. Added `ENGINE = MergeTree()` and `ORDER BY tuple()` so the table creation example is explicit and portable.
- The JSON arrays-per-row example used `JSONCompact`, but row-by-row arrays are documented as `JSONCompactEachRow`. Updated the comment and format name.
- The `JSONAsObject` example implied parsing a JSON array into ordinary columns. Updated it to show `JSONAsObject` storing objects in a single `JSON` column, which is how the format is documented.
- The JSON extraction example selected a `user_name` string into a table whose second column was `user Map(String, String)`. Updated the extraction to produce a `Map(String, String)` value and added an explicit `json String` structure for `JSONAsString`.
- The JSON schema inference settings did not include `input_format_json_try_infer_named_tuples_from_objects = 0`, which ClickHouse documents as necessary for `input_format_json_read_objects_as_strings` to take effect during object inference. Added the companion setting.
- The Parquet row group section claimed to read specific row groups, but the setting shown enables row-group pruning based on filters and metadata. Added a `WHERE` predicate and corrected the comment.
- The multiple URL example used an array of URLs, which is not part of the documented `url()` syntax. Replaced it with documented brace expansion.
- Two S3 examples used `s3://` URLs while the official ClickHouse examples consistently use HTTP-style S3 endpoint URLs. Replaced them with `https://bucket.s3.amazonaws.com/...` URLs for consistency with documented syntax.
- The S3 credentials comment said IAM role usage needed "no credentials" without qualification. Clarified that credentials can come from configuration or an IAM role.
- The error handling section said `errors_output_format` logs errors instead of failing. Updated the comment because the setting controls how errors are written to text output; it does not itself skip or log failed rows.
- The partitioned S3 export example selected `_partition_id` as a column instead of using `PARTITION BY`. Updated it to use `PARTITION BY toDate(created_at)` before the `SELECT`, matching ClickHouse's documented partitioned S3 write syntax.

## Review Notes
The post is now technically valid for current ClickHouse documentation. Some performance numbers remain illustrative rather than benchmark guarantees; future revisions could note that import times depend on hardware, dataset shape, compression, and ClickHouse settings.
