# Validation Summary: How to Set Up HTTP Basic Authentication in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface, user management, access control)
- HTTP Basic Authentication
- curl
- SQL (CREATE USER, ALTER USER, GRANT)
- XML configuration (config.xml, users.xml)
- TLS / HTTPS with OpenSSL
- SHA256 password hashing

## Sources Consulted
- ClickHouse HTTP Interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse system.session_log docs: https://clickhouse.com/docs/en/operations/system-tables/session_log
- ClickHouse CREATE USER docs: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse GitHub Issue #33858 (auth status code behavior): https://github.com/ClickHouse/ClickHouse/issues/33858
- ClickHouse server configuration docs (http_port, https_port, listen_host, openSSL)

## Issues Found
1. **Incorrect HTTP status code for authentication failure.** The post stated that unauthenticated requests would return `HTTP 401 Unauthorized`. ClickHouse actually returns `HTTP 403 Forbidden` for authentication failures (confirmed via ClickHouse source behavior and GitHub issue #33858, which explicitly notes ClickHouse returns 403 instead of 401 even in Kerberos flows). Changed to `HTTP 403 Forbidden` and fixed the awkward phrasing "default_user" to "the `default` user".
2. **Wrong system table for monitoring failed authentication attempts.** The post suggested querying `system.query_log` for failed authentication attempts, but failed authentications do not reach query execution and are not logged there. The correct table is `system.session_log`, which tracks all login/logout events including failures. Updated the bullet and the SQL query to use `system.session_log` with `type = 'LoginFailure'` and the `failure_reason` column.

## Review Notes
- SQL syntax for `CREATE USER ... IDENTIFIED WITH sha256_password BY '...'` and `ALTER USER default IDENTIFIED WITH sha256_password BY '...'` is correct ClickHouse syntax.
- Default HTTP port 8123 and HTTPS port 8443 are accurate.
- `config.xml` elements (`<http_port>`, `<https_port>`, `<listen_host>`, `<openSSL>`, `<certificateFile>`, `<privateKeyFile>`) are the correct ClickHouse server configuration names.
- `users.xml` use of `<password_sha256_hex>` is valid.
- `SELECT currentUser()` is a valid ClickHouse function.
- curl `-u` and `--cacert` flag usage is correct.
- URL-parameter-based credentials (`?user=&password=`) are supported by ClickHouse but correctly flagged as less secure.
- The post uses generic XML snippets without the `<clickhouse>` / `<yandex>` root element, which is acceptable since the snippets are illustrative fragments rather than full config files.
