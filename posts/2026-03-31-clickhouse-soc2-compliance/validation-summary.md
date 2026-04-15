# Validation Summary: How to Configure ClickHouse for SOC 2 Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL RBAC, encrypted disks, TLS, query logging, backup/restore)
- SOC 2 Type II Trust Service Criteria
- AWS S3 (for backup storage)

## Sources Consulted
- ClickHouse CREATE ROLE documentation: https://clickhouse.com/docs/sql-reference/statements/create/role
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse GRANT statement documentation: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse Backup and Restore documentation: https://clickhouse.com/docs/operations/backup/overview
- ClickHouse Backup to S3 documentation: https://clickhouse.com/docs/operations/backup/s3_endpoint
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.users documentation: https://clickhouse.com/docs/operations/system-tables/users
- ClickHouse system.role_grants documentation: https://clickhouse.com/docs/operations/system-tables/role_grants
- ClickHouse system.grants documentation: https://clickhouse.com/docs/operations/system-tables/grants
- ClickHouse Encrypted Disks / Storing Data documentation: https://clickhouse.com/docs/operations/storing-data
- ClickHouse TLS Configuration guide: https://clickhouse.com/docs/guides/sre/tls/configuring-tls
- ClickHouse Settings Profiles documentation: https://clickhouse.com/docs/operations/settings/settings-profiles
- ClickHouse 22.12 Release Notes (password complexity): https://clickhouse.com/blog/clickhouse-release-22-12
- ClickHouse password complexity PR #43719: https://github.com/ClickHouse/ClickHouse/pull/43719
- ClickHouse bcrypt authentication PR #44905: https://github.com/ClickHouse/ClickHouse/pull/44905

## Issues Found

1. **Incorrect claim about native password complexity**: The post stated "ClickHouse does not enforce password complexity natively." This is incorrect — ClickHouse has supported native `password_complexity` rules in `config.xml` since version 22.12 (December 2022). Updated the Password Policy section to show the correct `<password_complexity>` configuration with regex-based rules.

2. **double_sha1_password recommended for SOC 2 compliance**: The original post included `double_sha1_password` as an acceptable authentication method. SHA-1 is cryptographically broken (collision attacks demonstrated since 2017) and would likely be flagged by SOC 2 auditors. Removed `double_sha1_password` from the acceptable list and updated the recommendation to prefer `bcrypt_password`.

3. **BACKUP S3 URL format incorrect**: The post used `S3('s3://backups/clickhouse/', ...)` but ClickHouse BACKUP/RESTORE expects HTTPS endpoint URLs, not `s3://` protocol URLs. Changed to the documented format: `S3('https://backups.s3.us-east-1.amazonaws.com/clickhouse/', ...)`.

4. **BACKUP version number incorrect**: The post claimed BACKUP was available since "ClickHouse 22.4+" but it was introduced in version 22.7+. Corrected the version reference.

5. **system.users.auth_type query incorrect**: The `auth_type` column in `system.users` is of type `Array(Enum8)`, not a scalar. The original `NOT IN` comparison would not work correctly with an array column. Replaced with `hasAll()` array function for proper filtering.

6. **CREATE USER example updated**: Changed the `CREATE USER` example from `sha256_password` to `bcrypt_password` to align with the updated password policy recommendation for SOC 2 compliance.

## Review Notes
- The encrypted disk configuration uses `AES_128_CTR` which is the default algorithm. The placeholder `your_32_char_hex_key_here` correctly implies 32 hex characters (16 bytes), which is the correct key size for AES-128. An actual hex key example like `00112233445566778899aabbccddeeff` might be clearer.
- The `databases` and `tables` columns in `system.query_log` are `Array(LowCardinality(String))` types. The SELECT query is fine for display purposes, but filtering on these columns would require array functions.
- The SOC 2 Trust Service Criteria mapping table is accurate. CC6, CC7, CC8, A1, and C1 are the relevant criteria categories.
- All RBAC SQL syntax (CREATE ROLE, GRANT, CREATE USER) is correct and follows current ClickHouse documentation.
- TLS ports 8443 (HTTPS) and 9440 (secure TCP) are the correct default ClickHouse secure ports.
- The query_log XML configuration uses the correct structure and default flush interval of 7500ms.
