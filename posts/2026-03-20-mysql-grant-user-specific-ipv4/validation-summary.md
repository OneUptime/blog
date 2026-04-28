# Validation Summary: How to Grant MySQL User Access from a Specific IPv4 Address

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- MySQL (account management, GRANT system)
- MySQL host-based access control (`'user'@'host'` accounts)
- IPv4 addressing and wildcard patterns
- mysql CLI client

## Sources Consulted
- MySQL 8.0 Reference Manual — Specifying Account Names: https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL 8.0 Reference Manual — CREATE USER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — DROP USER Statement: https://dev.mysql.com/doc/refman/8.0/en/drop-user.html
- MySQL 8.0 Reference Manual — RENAME USER Statement: https://dev.mysql.com/doc/refman/8.0/en/rename-user.html
- MySQL 8.0 Reference Manual — REVOKE Statement: https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual — Privileges Provided by MySQL: https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual — FLUSH PRIVILEGES: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual — Server Error Reference (ER_HOST_NOT_PRIVILEGED, error 1130)

## Issues Found
No technical issues found.

All SQL statements use valid MySQL syntax:
- `CREATE USER 'user'@'host' IDENTIFIED BY 'password'` is correct.
- The `%` and `_` LIKE-style host wildcards are accurately described (`10.0.0.%` covers 10.0.0.0–10.0.0.255, `%` matches any host).
- The `localhost` vs `127.0.0.1` distinction (Unix socket vs TCP loopback) is correct on Unix-like systems.
- `mysql.user.authentication_string` is the correct column name in MySQL 5.7+ / 8.0.
- Privileges referenced (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `PROCESS`, `REPLICATION CLIENT`, `CREATE TEMPORARY TABLES`, `ALL`) are all valid privilege identifiers.
- `RENAME USER`, `REVOKE`, and `DROP USER` syntax is correct.
- ERROR 1130 (HY000) message format matches the actual MySQL server error.

## Review Notes
- `FLUSH PRIVILEGES` is included after `CREATE USER` / `GRANT` / `REVOKE` / `DROP USER` statements. Per the MySQL docs, this is not strictly required when using account-management statements (only when modifying grant tables directly with `INSERT`/`UPDATE`/`DELETE`). It is harmless and a common convention, so it has been left as-is.
- `REPLICATION CLIENT` is still a valid privilege in MySQL 8.0 but has been deprecated in favor of the dynamic `REPLICATION_SLAVE_ADMIN` / `BINLOG_ADMIN` privileges in some contexts. The legacy name still works and is widely used, so no change is needed.
- The bash code blocks contain interactive `mysql` shell SQL statements (with `--` SQL comments). Mixing shell and SQL in one fenced block is a stylistic choice rather than a correctness issue.
- The ERROR 1130 message in the post is truncated to "...is not allowed to connect"; the actual full message ends with "...to connect to this MySQL server". The truncation is acceptable for illustration.
- The post focuses on IPv4 wildcard host patterns. Note that for IPv6 addresses, MySQL also supports IPv6 hosts but the syntax differs slightly (e.g., quoting requirements). This is out of scope for an IPv4-specific post.
