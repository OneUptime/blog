# Validation Summary: How to Store IPv6 Addresses in Database Columns

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- PostgreSQL `inet` and `cidr` types
- PostgreSQL GiST and B-tree indexes
- MySQL `VARBINARY`, generated columns, `INET6_ATON()`, and `INET6_NTOA()`
- MariaDB `VARBINARY`, `INET6_ATON()`, `INET6_NTOA()`, and `INET6`
- Python `ipaddress`
- SQLite `TEXT`, indexes, and `datetime('now')`

## Sources Consulted
- PostgreSQL Network Address Types: https://www.postgresql.org/docs/current/datatype-net-types.html
- PostgreSQL Network Address Functions and Operators: https://www.postgresql.org/docs/current/functions-net.html
- PostgreSQL GiST Indexes and built-in `inet_ops`: https://www.postgresql.org/docs/current/gist.html
- MySQL 8.4 Miscellaneous Functions, including `INET6_ATON()` and `INET6_NTOA()`: https://dev.mysql.com/doc/refman/8.4/en/miscellaneous-functions.html
- MariaDB `INET6_ATON()` documentation: https://mariadb.com/docs/server/reference/sql-functions/secondary-functions/miscellaneous-functions/inet6_aton
- MariaDB `INET6` data type documentation: https://mariadb.com/kb/en/inet6/
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- SQLite Datatypes documentation: https://www.sqlite.org/datatype3.html
- SQLite Date and Time Functions documentation: https://www.sqlite.org/lang_datefunc.html

## Issues Found
- The PostgreSQL `<<` operator comment described general containment but the official documentation defines `<<` as strict subnet containment. Updated the comment to say "is strictly contained in".
- The MySQL/MariaDB section implied `VARBINARY(16)` was the only MariaDB option. MariaDB 10.5+ has a native `INET6` data type, so the text now notes that `VARBINARY(16)` is the portable MySQL/MariaDB approach.
- The MySQL `VARBINARY(16)` comment implied every value is 16 bytes. MySQL and MariaDB return 16 bytes for IPv6 and 4 bytes for IPv4 from `INET6_ATON()`, so the comment now reflects that.
- The MySQL insert comment called `192.168.1.5` IPv4-mapped. It is a plain IPv4 address, so the comment now says `INET6_ATON()` handles IPv4 too.
- The Python normalization snippet only converted lowercase `::ffff:` mapped IPv4 inputs to IPv4 strings. Updated it to parse first with `ipaddress.ip_address()` and then check `IPv6Address.ipv4_mapped`, which handles mapped IPv4 consistently.
- The conclusion used the non-existent MySQL function name `INET6_NTOP()`. Corrected it to `INET6_NTOA()`.

## Review Notes
- The Python normalization example was executed locally with IPv6, bracketed IPv6, zone ID, lowercase IPv4-mapped, and uppercase IPv4-mapped inputs.
- The SQLite schema snippet was verified through Python's standard `sqlite3` module because the standalone `sqlite3` CLI is not installed in this environment.
- PostgreSQL and MySQL/MariaDB SQL snippets were reviewed against official documentation; no local database servers were available for execution.
