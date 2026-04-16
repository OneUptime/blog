# Validation Summary: How to Configure IP Allowlists in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (SQL user management, `CREATE USER` / `ALTER USER`, `users.xml`, `config.xml`, `system.users`)
- CIDR notation and IPv6 addressing
- Linux firewalls: `ufw`, `iptables`
- `clickhouse-client` CLI

## Sources Consulted
- ClickHouse official docs: CREATE USER — https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse official docs: system.users — https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse source code: `src/Parsers/Access/ParserCreateUserQuery.cpp` (allowed_client_hosts grammar and error messages)
- ClickHouse official docs: server configuration (`listen_host`) — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- `ufw` and `iptables` man pages for firewall command syntax

## Issues Found
No technical issues found.

Specifically verified:
- `HOST IP`, `HOST LOCAL`, `HOST ANY`, `HOST NAME` clauses are valid and behave as described.
- Both `HOST IP 'a', HOST IP 'b'` and `HOST IP 'a', IP 'b'` parse correctly; the ClickHouse parser loops over repeated HOST clauses and also accepts mixed types within a single HOST clause.
- `system.users` column names (`host_ip`, `host_names`, `host_names_regexp`, `host_names_like`) are correct and all `Array(String)`.
- The claim that ClickHouse returns an identical generic error for wrong password vs. disallowed IP is confirmed in source: it deliberately emits "Authentication failed: password is incorrect, or there is no user with such name" to prevent user enumeration; the precise reason is only logged server-side.
- `users.xml` `<networks>` / `<ip>` structure, `listen_host` server config, and default port numbers (9000 native, 9440 native TLS, 8123 HTTP, 8443 HTTPS) are all correct.
- `ufw` and `iptables` command syntax matches current usage.

## Review Notes
- The `GRANT SELECT ON system.metrics` and `GRANT SELECT ON system.asynchronous_metrics` grants in the Prometheus example are redundant because `GRANT SELECT ON system.*` already covers them. Not incorrect, just unnecessary — kept as-is since the task is to fix technical errors only.
- `HOST LOCAL` already covers IPv6 loopback (`::1`) and IPv4 loopback (`127.0.0.1`), so the `ALTER USER local_admin HOST LOCAL, HOST IP '::1'` example is technically redundant but harmless and illustrative.
- The `fd00::/8` IPv6 range in the `users.xml` example is the IANA-reserved Unique Local Address prefix (strictly `fc00::/7`, but `fd00::/8` is the locally-assigned half), which is a valid and reasonable example value.
