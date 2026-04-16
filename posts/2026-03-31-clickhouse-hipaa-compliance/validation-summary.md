# Validation Summary: How to Configure ClickHouse for HIPAA Compliance

## Status
validated

## Post Type
Tutorial / Compliance configuration guide

## Technologies Covered
- ClickHouse (SQL RBAC, settings profiles, disk encryption, BACKUP/RESTORE, system.query_log)
- HIPAA Security Rule technical safeguards (45 CFR 164.312)
- TLS / HTTPS transport security
- AES-CTR disk encryption
- S3 (as a backup destination)

## Sources Consulted
- ClickHouse disk encryption / storing data: https://clickhouse.com/docs/operations/storing-data
- ClickHouse system.query_log columns: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse GRANT statement: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse network ports / SRE guide: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse BACKUP: https://clickhouse.com/docs/operations/backup
- ClickHouse CREATE/ALTER USER: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- HIPAA Security Rule 45 CFR 164.312 and retention at 164.316(b)(2)

## Issues Found

1. **`rows_read` is not a valid `system.query_log` column.** The correct column name is `read_rows`. Fixed in the audit log query.

2. **`max_execution_time` does not implement HIPAA automatic logoff.** It caps per-query runtime, not idle session duration. Replaced with `idle_connection_timeout`, which closes idle TCP connections after the configured interval and more closely approximates the automatic-logoff control (noting that HIPAA automatic logoff is typically also enforced at the client/application layer).

3. **`password` BACKUP setting is not supported for S3 destinations.** Per ClickHouse docs, `password` only applies to ZIP-archive backups on a file disk. Removed `password = 'BackupEncryptionKey!'` from the S3 example and added a short note directing readers to S3 server-side encryption for at-rest protection, with ZIP-on-file-disk as the alternative when a backup password is required.

## Review Notes
- The `<key_hex>` placeholder string is 31 characters of non-hex text. It is clearly a placeholder, but readers should note AES_128_CTR requires exactly 32 hex characters (16 bytes); AES_192_CTR = 48 hex chars; AES_256_CTR = 64 hex chars. The ClickHouse docs also recommend using `<key_hex id="0">` with a `<current_key_id>` element to support key rotation — the post's simpler form works but does not accommodate rotation.
- `ALTER TABLE system.query_log MODIFY TTL` requires that the deployment's `query_log` configuration uses a MergeTree-family engine with `event_date` (the default). Operators who have customized the query log engine in `config.xml` may need to adjust the engine definition there instead.
- The HIPAA retention floor of 6 years is documented under 45 CFR 164.316(b)(2); the post's 7-year retention is a safe margin.
- Disabling the plaintext `http_port`, `tcp_port`, and `interserver_http_port` is correct for enforcing TLS, but operators should confirm their client drivers (JDBC, HTTP, native) are configured for the corresponding `_secure` / `https` ports before applying the change to avoid lockout.
