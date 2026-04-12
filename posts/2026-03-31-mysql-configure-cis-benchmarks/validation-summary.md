# Validation Summary: How to Configure MySQL for CIS Benchmarks

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- CIS Benchmarks (MySQL)
- Linux file permissions (chmod, chown)
- Lynis (system auditing tool)
- mysqlcheck (MySQL table maintenance utility)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Server Command Options (symbolic-links, skip-name-resolve): https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- MySQL 8.0 — Options Added, Deprecated, or Removed: https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html
- MySQL 8.0 — Security Considerations for LOAD DATA LOCAL: https://dev.mysql.com/doc/refman/8.0/en/load-data-local-security.html
- MySQL 8.0 — Caching SHA-2 Pluggable Authentication: https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 — mysqlcheck Table Maintenance Program: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 — Using Option Files: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- MySQL 8.0 — Configuring Encrypted Connections: https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html

## Issues Found
- **`symbolic-links = 0` missing deprecation note**: The `--symbolic-links` option was deprecated in MySQL 8.0.2 and removed in later MySQL versions. Including it in a MySQL 8.0 config file still works but produces a deprecation warning; on MySQL 8.4+ it may cause a startup error. Added a comment in the config snippet noting the deprecation so readers targeting MySQL 8.0+ are aware.

## Review Notes
- `local-infile = 0` is redundant on MySQL 8.0+ (default is already OFF since 8.0.2) but is good practice as defense-in-depth. No change needed.
- `max_connect_errors = 10` is intentionally stricter than the MySQL default of 100. The blog's comment ("Set a low limit") already communicates this intent.
- The SUPER privilege is being gradually deprecated in MySQL 8.0 in favor of dynamic privileges, but `REVOKE SUPER` still works. No change needed since the blog doesn't claim SUPER is the only privilege model.
- All SQL statements (DROP USER, REVOKE, ALTER USER, SELECT queries) are syntactically correct and use current MySQL 8.0 syntax.
- All bash commands (chmod, chown, mysqlcheck, lynis) use correct flags and syntax.
