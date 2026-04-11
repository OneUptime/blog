# Validation Summary: How to Use MySQL Shell for Data Import and Export

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell
- util.importTable()
- util.exportTable()
- util.dumpSchemas() / util.loadDump()
- Amazon S3 integration

## Sources Consulted
- MySQL Shell 8.4 — Table Export Utility (util.exportTable): https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-table-export.html
- MySQL Shell 8.4 — Parallel Table Import Utility (util.importTable): https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-parallel-table.html
- MySQL Shell 9.6 — Parallel Table Import Utility (util.importTable): https://dev.mysql.com/doc/mysql-shell/9.6/en/mysql-shell-utilities-parallel-table.html
- MySQL Shell 8.4 — Dump Instance/Schema/Table Utilities: https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-dump-instance-schema.html
- MySQL Shell 8.4 — Dump Loading Utility (util.loadDump): https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-load-dump.html

## Issues Found

1. **`default` dialect mislabeled as "TSV"**: The `default` dialect was described as "(TSV)" but it is not the same as the `tsv` dialect. The `default` dialect matches `SELECT...INTO OUTFILE` defaults (TAB separator, LF line endings, no field enclosure), while `tsv` uses TAB separator with CRLF line endings and single-quote enclosure. Changed the label to clarify that `default` matches `SELECT...INTO OUTFILE` defaults.

2. **`maxBytesPerTransaction` is not a `util.importTable()` option**: The post listed `maxBytesPerTransaction` as an import option, but this option belongs to `util.loadDump()`, not `util.importTable()`. Replaced with `bytesPerChunk`, which is the correct `util.importTable()` option that controls chunk size for parallel processing of a single file.

3. **Glob patterns must be passed as an array**: The post passed a glob pattern as a single string to `util.importTable()`. According to the official docs, glob patterns and multiple file paths must be provided as an array (the `file_list` form). Changed from `util.importTable("/data/exports/orders_*.tsv", {...})` to `util.importTable(["/data/exports/orders_*.tsv"], {...})`.

4. **Incorrect S3 import syntax**: The post used `s3://my-bucket/data/orders.csv` as the file path, which is not the documented URI format for `util.importTable()`. The correct approach is to specify the file path within the bucket as a regular string (e.g., `"data/orders.csv"`) and use the `s3BucketName` option to identify the bucket. Removed the `s3://my-bucket/` prefix from the file path.

## Review Notes
- The HTTPS URL import example is correct, though the post could mention that glob/wildcard patterns are not supported for HTTP/HTTPS sources.
- The `util.exportTable()` syntax, options, and `util.dumpSchemas()`/`util.loadDump()` examples were all verified as correct.
- The monitoring output example is illustrative and reasonable, though exact formatting may vary by MySQL Shell version.
