# Validation Summary: How to Set Up IP Whitelisting in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (users.xml configuration, SQL access control)
- ClickHouse `system.users` system table
- UFW (Uncomplicated Firewall)
- nginx (reverse proxy with IP allow/deny)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse CREATE USER docs: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse system.users table docs: https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse user settings docs: https://clickhouse.com/docs/en/operations/settings/settings-users
- UFW manual (standard `ufw allow from ... to any port ...` syntax)
- nginx ngx_http_access_module (`allow`/`deny` directives)

## Issues Found
No technical issues found.

- The `users.xml` `<networks>` / `<ip>` structure matches the official documentation.
- The SQL `CREATE USER ... IDENTIFIED WITH plaintext_password BY '...' HOST IP 'addr', IP 'addr'` syntax is correct, including the comma-separated `IP` clauses.
- `ALTER USER ... HOST IP '...'` is a valid statement.
- `system.users` does expose both `host_ip` and `host_names` columns (Array(String)).
- ClickHouse default ports 9000/TCP (native) and 8123/TCP (HTTP) are correct.
- Error code 516 corresponds to `AUTHENTICATION_FAILED`, which is what ClickHouse returns when a user is rejected due to host restrictions.
- The nginx `allow`/`deny`/`proxy_pass` snippet is syntactically valid.
- UFW rules are added in the correct order (specific allow before generic deny), which matches UFW's first-match semantics.

## Review Notes
- The post says "ClickHouse 20.4+" for SQL-driven user creation. The SQL access-control workflow became fully stable around 20.5 and requires `access_management = 1` to be set on a user (and an access storage backend configured). This nuance isn't called out, but the version statement is close enough not to be misleading.
- The nginx example uses `listen 8443 ssl;` without showing `ssl_certificate`/`ssl_certificate_key` directives. This is fine as an illustrative snippet but would not run as-is; readers should add TLS material in a real deployment.
- `plaintext_password` is used in the SQL example to mirror the XML `<password>` example. For production, `sha256_password` or `double_sha1_password` would be preferable, but plaintext is technically valid syntax and consistent with the XML section.
