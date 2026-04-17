# Validation Summary: How to Use gcs() Table Function for Google Cloud Storage in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- `gcs()` table function
- Google Cloud Storage (GCS)
- GCS XML / S3-compatible interoperability API (HMAC keys)
- File formats: Parquet, JSONEachRow, CSVWithNames
- ClickHouse Named Collections
- ClickHouse `S3` table engine (as the persistent alternative to the `gcs()` function)

## Sources Consulted
- ClickHouse `gcs()` table function docs: https://clickhouse.com/docs/sql-reference/table-functions/gcs
- ClickHouse `s3()` table function docs: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse integration with Google Cloud Storage: https://clickhouse.com/docs/integrations/gcs
- ClickHouse Named Collections docs: https://clickhouse.com/docs/en/operations/named-collections
- ClickHouse list of integration table engines: https://clickhouse.com/docs/en/engines/table-engines

## Issues Found
1. **Non-existent `googleCloudStorage` table engine** — The original post referenced a `googleCloudStorage` / `GoogleCloudStorage` table engine in the comparison section and summary. ClickHouse does not have a table engine by either of those names. Per the official docs, `gcs()` is an alias of `s3()`, and GCS access from a persistent table is done via the existing `S3` table engine pointed at a `https://storage.googleapis.com/...` URL (using GCS HMAC keys). Fixed the comparison table and the summary paragraph to reference the `S3` table engine instead.
2. **Incorrect named-collection call syntax** — The original named-collection example used positional arguments after the collection:
   ```sql
   FROM gcs(gcs_creds, 'https://...parquet', 'Parquet');
   ```
   Per the documented syntax `gcs(named_collection[, option=value [,..]])`, overrides/extra parameters after a named collection must be passed as `option=value`. Updated the example to use `url = '...'` and `format = 'Parquet'`.

## Review Notes
- HMAC key generation path (GCP Console → Cloud Storage → Settings → Interoperability) is accurate.
- Glob patterns (`*`, `**`, `?`, `{a,b,c}`) are supported by `gcs()`, so the Q1 2026 example `2026-0{1,2,3}-*.parquet` is valid.
- The claim that `gcs()` supports the same formats as `s3()` (Parquet, CSV, JSONEachRow, ORC, etc.) is accurate since `gcs()` is implemented as an alias of `s3()`.
- `CSVWithNames` and `JSONEachRow` format identifiers are correct.
- Named collection fields `access_key_id` and `secret_access_key` are the correct parameter names used by ClickHouse when authenticating against the GCS XML API with HMAC keys.
- No version-specific caveats flagged; all APIs verified are current as of the 2026-04 ClickHouse documentation.
