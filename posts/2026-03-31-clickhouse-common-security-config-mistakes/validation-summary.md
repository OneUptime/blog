# Validation Summary: Common ClickHouse Security Configuration Mistakes

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- ClickHouse server configuration (users.xml, config.xml)
- ClickHouse native TCP protocol (port 9000) and HTTP interface (port 8123)
- TLS/SSL configuration (https_port 8443, tcp_port_secure 9440)
- ClickHouse SQL access control (CREATE USER, GRANT, REVOKE)
- Interserver replication protocol (port 9009)
- ClickHouse system tables (system.query_log)

## Sources Consulted
- ClickHouse official docs — Users and Roles Settings: https://clickhouse.com/docs/en/operations/settings/settings-users
- ClickHouse official docs — Server Configuration Parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse official docs — OpenSSL configuration (openSSL section): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#openssl
- ClickHouse official docs — Interserver HTTP credentials: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#interserver-http-credentials
- ClickHouse official docs — SQL Reference: CREATE USER, GRANT, REVOKE: https://clickhouse.com/docs/en/sql-reference/statements/create/user, https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse official docs — system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
No technical issues found.

- The default user having no password and the port numbers (9000 native, 8123 HTTP, 8443 HTTPS, 9440 secure TCP, 9009 interserver HTTP) are all accurate.
- The `users.xml` XML structure with `password_sha256_hex` and `networks/ip` elements is correct; the comment `echo -n 'your_password' | sha256sum` is the documented method to generate the hash, and the hash shown is a placeholder example.
- The `openSSL` / `server` block with `certificateFile`, `privateKeyFile`, and `caConfig` matches ClickHouse's documented schema.
- `CREATE USER ... IDENTIFIED BY '...'` and `GRANT SELECT/INSERT ON db.table TO user` are valid ClickHouse SQL (RBAC introduced in 20.4+ and supported in all current versions).
- `interserver_http_credentials` element and child `user`/`password` tags are the correct configuration keys.
- `REVOKE SELECT ON system.query_log FROM app_reader` is valid — ClickHouse supports per-system-table grants/revokes.

## Review Notes
- The post omits mention of `password_double_sha1_hex` (used for MySQL-protocol compatibility) and the newer `IDENTIFIED WITH sha256_password / bcrypt_password` alternatives in SQL-driven user management; not wrong, just incomplete.
- The recommendation to "disable the plain HTTP and TCP ports after confirming TLS works" is correct — this is done by omitting `http_port` and `tcp_port` entries or setting them to empty. A small callout for how to disable them could help readers, but absence is not an error.
- The claim that "any node on the network can join the cluster" in Mistake 5 is slightly imprecise — cluster membership is determined by the `remote_servers` configuration, but the core concern (unauthenticated replication traffic allowing data reads and injection) is valid and the recommended fix is the correct one.
- ClickHouse now supports more granular interserver TLS via `interserver_https_port` and SSL configuration; not required for the post's scope.
