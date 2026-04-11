# Validation Summary: How to Use MySQL Shell Dump Utilities

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (mysqlsh)
- MySQL Shell Dump Utilities (util.dumpInstance, util.dumpSchemas, util.dumpTables)
- Amazon S3 (as a dump target)

## Sources Consulted
- MySQL Shell 8.0 Reference: Instance and Schema Dump Utilities — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-instance-schema.html
- MySQL Shell 8.0 Reference: Table Dump Utility — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-tables.html

## Issues Found

1. **S3 dump syntax incorrect** — The blog used `"s3://my-bucket/backups/instance_dump"` as the `outputUrl` argument. Per the MySQL Shell documentation, the first argument should be a plain prefix path (e.g., `"backups/instance_dump"`), not an `s3://` URI. The bucket is specified solely via the `s3BucketName` option. Fixed the example to use `"backups/instance_dump"` as the output URL.

2. **Missing `ndbinfo` from excluded system schemas** — The blog listed four system schemas excluded by `dumpInstance()` (`information_schema`, `performance_schema`, `mysql`, `sys`) but the documentation lists five: `information_schema`, `mysql`, `ndbinfo`, `performance_schema`, and `sys`. Added `ndbinfo` to the list.

## Review Notes
- The `consistent` option description ("ensures a consistent snapshot using a global read lock") is a simplification. The actual mechanism involves `FLUSH TABLES WITH READ LOCK`, then `START TRANSACTION WITH CONSISTENT SNAPSHOT` on each thread, then `LOCK INSTANCE FOR BACKUP`, after which the global read lock is released. This is acceptable for a high-level tutorial but readers needing precise locking behavior should consult the official docs.
- The `users: true` example is technically redundant since `true` is the default for `dumpInstance()`. Not incorrect, but could be noted.
- The dump output example shows both `mydb@orders.tsv.zst` and `mydb@orders@@0.tsv.zst`. In practice a given table will produce one format or the other depending on whether chunking is applied, but showing both is reasonable for illustration.
- All function signatures, option names, and default values are accurate.
