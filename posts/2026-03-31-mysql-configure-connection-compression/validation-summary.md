# Validation Summary: How to Configure MySQL Connection Compression

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0 (specifically 8.0.18+ for zstd and new compression options)
- zlib and zstd compression algorithms
- MySQL client CLI (`mysql`, `mysqldump`)
- Node.js `mysql2` driver
- Java JDBC (MySQL Connector/J)
- Python `mysql-connector-python`

## Sources Consulted
- [MySQL 8.0 Reference Manual: Connection Compression Control](https://dev.mysql.com/doc/refman/8.0/en/connection-compression-control.html) — verified server system variables, client options, deprecation of `--compress`, and compression negotiation behavior
- [MySQL 8.4 Reference Manual: Connection Compression Control](https://dev.mysql.com/doc/refman/8.4/en/connection-compression-control.html)
- [MySQL 8.4 Reference Manual: ALTER USER Statement](https://dev.mysql.com/doc/refman/8.4/en/alter-user.html) — confirmed ALTER USER has no per-user compression requirement clause
- [mysql2 npm package / GitHub](https://github.com/sidorares/node-mysql2) — verified `compress` connection option exists

## Issues Found

### 1. Invalid server-side `zstd_compression_level` variable (lines 69–73)
**What was wrong:** The post showed `zstd_compression_level = 6` in a `[mysqld]` configuration block, implying it is a server system variable. This variable does not exist. The only server-side compression variable is `protocol_compression_algorithms`. The zstd compression level is a client-side setting configured via `--zstd-compression-level`.
**What was changed:** Replaced the incorrect `[mysqld]` config block with an explanation that zstd level is a client-side option (`--zstd-compression-level`, values 1–22, default 3).

### 2. Completely incorrect "Requiring Compression for Specific Users" section (lines 77–85)
**What was wrong:** The section claimed to show how to force compression for a user account, but the `ALTER USER` SQL shown (`REQUIRE SUBJECT '' WITH MAX_CONNECTIONS_PER_HOUR 0`) is about SSL/TLS certificate requirements and connection resource limits — entirely unrelated to compression. The follow-up advice about `REQUIRE CIPHER` is also unrelated. MySQL does not support per-user compression requirements.
**What was changed:** Rewrote the section as "Requiring Compression for All Connections" with the correct approach: removing `uncompressed` from `protocol_compression_algorithms` so only compressed connections are accepted.

### 3. `--compress` presented as current without deprecation note (line 34)
**What was wrong:** The `--compress` option is deprecated as of MySQL 8.0.18. The post framed `--compression-algorithms` as "the long form" of `--compress`, when in fact they are different options (legacy vs. replacement).
**What was changed:** Added a deprecation notice and reframed `--compression-algorithms` as the recommended replacement rather than a "long form."

### 4. mysqldump using deprecated `--compress` flag (line 54)
**What was wrong:** The mysqldump example used `--compress`, which is deprecated since MySQL 8.0.18.
**What was changed:** Replaced with `--compression-algorithms=zlib`.

## Review Notes
- The Node.js `mysql2` driver does accept a `compress: true` option, though GitHub issues indicate the feature has had reliability problems historically. The option name is correct as documented.
- The JDBC `useCompression=true` and Python `compress=True` options are correct per their respective connector documentation.
- The `SHOW STATUS LIKE 'Compression'` command is correct and returns `ON`/`OFF` as described.
- The post's guidance on when to use vs. avoid compression (WAN vs. local, bandwidth-bound vs. CPU-bound) is sound.
