# Validation Summary: How to Use util.dumpSchemas() in MySQL Shell

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (mysqlsh)
- MySQL Shell Dump Utilities (`util.dumpSchemas()`, `util.loadDump()`)
- Amazon S3 (cloud storage target)

## Sources Consulted
- MySQL Shell 8.0 Reference: Instance Dump Utility, Schema Dump Utility, and Table Dump Utility — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-instance-schema.html
- MySQL Shell 8.0 Reference: Dump Loading Utility — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-load-dump.html

## Issues Found

1. **`consistent: true` description was oversimplified (line 47).** The blog stated it "acquires a global read lock for a point-in-time consistent dump." In reality, the mechanism is multi-step: MySQL Shell uses `FLUSH TABLES WITH READ LOCK` (or `LOCK TABLES` if the user lacks `RELOAD`), starts consistent snapshot transactions across all threads, issues `LOCK INSTANCE FOR BACKUP`, and then releases the initial lock. Also noted that `consistent` defaults to `true`, so explicitly setting it is redundant (though acceptable for clarity). **Fixed** the description to accurately describe the mechanism and note the default.

2. **`partitionByCount` option does not exist (line 98).** The "Limiting Rows per Table" section used a fabricated option `partitionByCount` that does not exist in the MySQL Shell dump utilities API. The only partition-related option is `partitions` (an array of partition names to include). **Fixed** by removing `partitionByCount` and rewriting the section to use a proper WHERE condition instead.

3. **`LIMIT` embedded in `where` clause value (line 99).** The blog used `"1=1 LIMIT 10000"` as a `where` condition. The `where` option value is expected to be a valid SQL boolean condition, not a full query clause. Embedding `LIMIT` is undocumented, unreliable, and an abuse of the interface. **Fixed** by replacing it with a proper condition (`"id <= 10000"`).

4. **S3 `outputUrl` format was incorrect (line 106).** The blog passed `"s3://my-bucket/schema-dumps/mydb"` as the `outputUrl` while also specifying `s3BucketName: "my-bucket"`. When using the `s3BucketName` option, the `outputUrl` should be a plain prefix string (the path within the bucket), not an `s3://` URI. **Fixed** the outputUrl to `"schema-dumps/mydb"`.

## Review Notes
- The `consistent` option defaults to `true`, so explicitly setting it in the "Parallel Export with Options" example is redundant. It was kept for pedagogical clarity but the text now notes this.
- The post does not mention the `ocimds` option for Oracle Cloud Infrastructure compatibility checks, or the `compatibility` option for cross-platform migration adjustments. These are not errors, just potential future additions.
- All other options (`threads`, `compression`, `ddlOnly`, `dataOnly`, `excludeTables`, `where`, `s3BucketName`, `s3Region`) and the `util.loadDump()` `dryRun` option were verified as correct.
- Output file format description (`.sql`, `.tsv.zst`, `.json`) is accurate. The dump also produces `.tsv.zst.idx` index files which are not mentioned, but this omission is not an error.
