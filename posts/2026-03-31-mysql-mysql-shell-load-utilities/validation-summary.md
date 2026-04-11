# Validation Summary: How to Use MySQL Shell Load Utilities

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (`util.loadDump()`)
- MySQL Shell Dump Load Utility
- Amazon S3 (as a dump source)
- GTID replication

## Sources Consulted
- MySQL Shell 8.0 Reference: Dump Loading Utility — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-load-dump.html

## Issues Found

1. **False claim about automatic CPU core detection (line 23):** The post stated "The utility automatically detects the number of available CPU cores and sets an appropriate thread count." This is incorrect — the documentation states the thread count simply defaults to 4 with no adaptive behavior. Changed to: "using the default of 4 parallel threads."

2. **Incorrect S3 first argument format (line 86):** The post used `"s3://my-bucket/backups/mydb_dump"` as the first argument to `util.loadDump()`. The first argument should be the path prefix within the bucket (e.g., `"backups/mydb_dump"`), with the bucket name specified separately via the `s3BucketName` option. The `s3://` URI scheme is not used by this utility. Changed to `"backups/mydb_dump"`.

3. **Incorrect `excludeUsers` format (line 112):** The post used `["root@localhost"]`. The MySQL Shell documentation requires single quotes around both the user name and host name: `["'root'@'localhost'"]`. Changed to the correct quoted format.

## Review Notes
- The `deferTableIndexes` default value is `fulltext`, which the post demonstrates in its example but does not explicitly state as the default. This is acceptable as-is.
- The `progressFile` behavior description is accurate — when omitted for local storage, MySQL Shell auto-creates a `load-progress-<server-uuid>.json` file in the dump directory. The post's advice to always specify it for large loads is sound.
- All other options (`threads`, `resetProgress`, `updateGtidSet`, `includeSchemas`, `includeTables`, `excludeTables`, `dryRun`, `loadUsers`) are correctly documented with accurate value ranges and formats.
