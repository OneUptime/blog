# Validation Summary: How to Use util.dumpInstance() in MySQL Shell

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (mysqlsh)
- MySQL Shell Dump/Load Utilities (util.dumpInstance, util.loadDump)
- OCI Object Storage integration
- Amazon S3 integration

## Sources Consulted
- MySQL Shell 8.0 Reference Manual: Instance Dump Utility (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-instance-schema.html)
- MySQL Shell 8.0 Reference Manual: Dump Loading Utility (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-load-dump.html)

## Issues Found
1. **Incorrect S3 outputUrl format**: The Amazon S3 example used `"s3://my-bucket/backups/instance"` as the outputUrl. In MySQL Shell, when using S3, the first argument is the path prefix within the bucket (e.g., `"backups/instance"`), not an `s3://` URI. The bucket name is specified separately via the `s3BucketName` option. Fixed the outputUrl from `"s3://my-bucket/backups/instance"` to `"backups/instance"`.

## Review Notes
- The `consistent` option description says it "acquires a global read lock." More precisely, MySQL Shell uses `LOCK INSTANCE FOR BACKUP` (MySQL 8.0.17+) or falls back to `FLUSH TABLES WITH READ LOCK`. The post's description is a reasonable simplification for a tutorial.
- All other code examples, option names, default values, and output file structures are accurate per the MySQL Shell 8.0 documentation.
- The OCI Object Storage example correctly uses `osBucketName`, `osNamespace`, and `ociConfigFile` options.
