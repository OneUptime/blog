# Validation Summary: How to Fix 'Authentication failed' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (server, access control, RBAC)
- ClickHouse `users.xml` configuration
- `clickhouse-client` CLI
- ClickHouse HTTP interface
- SHA256 password hashing
- SQL-driven user management (CREATE USER / ALTER USER / GRANT)

## Sources Consulted
- ClickHouse official documentation — `system.users` table: https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse `CREATE USER` statement: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse `ALTER USER` statement: https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse user configuration (users.xml): https://clickhouse.com/docs/en/operations/settings/settings-users
- ClickHouse `clickhouse-client` reference: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse HTTP interface: https://clickhouse.com/docs/en/interfaces/http

## Issues Found
No technical issues found.

All verified items:
- `system.users` columns (`name`, `storage`, `host_ip`, `host_names`, `host_names_regexp`, `default_roles_list`) are valid.
- `ALTER USER ... IDENTIFIED WITH sha256_password BY '...'` syntax is correct.
- `ALTER USER ... HOST IP '...'` with multiple CIDR values is correct.
- `ALTER USER default HOST LOCAL` is valid.
- `<password_sha256_hex>` and `<networks>` elements in `users.xml` are accurate.
- Error message wording matches actual ClickHouse output.
- `clickhouse-client` flags (`--host`, `--port`, `--user`, `--password`, `--query`) are valid.
- Default ports (HTTP 8123, native TCP 9000) are correct.
- `echo -n "..." | sha256sum` correctly produces the hex digest expected by `password_sha256_hex`.

## Review Notes
- Transmitting passwords via URL query string (as in the `curl` example for the HTTP interface) is acceptable for quick local testing but appears in server logs and process listings. For production debugging, prefer HTTP headers (`X-ClickHouse-User`, `X-ClickHouse-Key`) or HTTPS with Basic Auth. This is a general best-practice caveat rather than a technical inaccuracy.
- `sha256_password` is widely used and supported, but newer ClickHouse versions also offer `double_sha1_password`, `bcrypt_password`, and `ldap`/`kerberos` auth modes. The post scopes itself to `sha256_password`, which is fine for the stated troubleshooting purpose.
- The `<password>` plaintext element shown inside the `<analyst>` network example is valid XML config syntax but is generally discouraged in favor of `<password_sha256_hex>`; the post already makes this point in the Summary.
