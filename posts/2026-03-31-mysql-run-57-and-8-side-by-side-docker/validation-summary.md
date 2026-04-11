# Validation Summary: How to Run MySQL 5.7 and MySQL 8 Side by Side in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7
- MySQL 8.0
- Docker / Docker Compose
- mysqldump
- Bash scripting

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- MySQL 8.0 Reference Manual: Server System Variables (sql_mode) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sql_mode
- MySQL 8.0 Reference Manual: Authentication Plugin Changes — https://dev.mysql.com/doc/refman/8.0/en/upgrading-from-previous-series.html#upgrade-caching-sha2-password
- MySQL 8.0 Reference Manual: GROUP BY Handling — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- Docker Hub Official MySQL Image — https://hub.docker.com/_/mysql
- Bash Reference Manual: Shell Parameter Expansion — https://www.gnu.org/software/bash/manual/bash.html#Shell-Parameter-Expansion

## Issues Found

1. **Incorrect claim: "removal of the `utf8` alias"** — MySQL 8.0 deprecated the `utf8` alias for `utf8mb3` but did NOT remove it. The `utf8` charset alias still works in MySQL 8.0 (with deprecation warnings). Changed "removal of the `utf8` alias" to "deprecation of the `utf8` alias for `utf8mb3`".

2. **Broken bash password expansion in loop** — The script used `${PORT##330}` to derive passwords from port numbers. For port 3306 this expands to `6` (password `root6`), and for port 3307 it expands to `7` (password `root7`). These do not match the passwords set in Docker Compose (`root57` and `root80`), so the script would fail to authenticate. Replaced with an explicit if/else to select the correct password for each port.

3. **Incorrect reference to `utf8mb3` in dump output** — The post stated the MySQL 5.7 dump might contain `utf8mb3`. A mysqldump from MySQL 5.7 would use `utf8` (not `utf8mb3`) in CHARACTER SET clauses, since `utf8mb3` was not the standard name in 5.7. Changed `utf8mb3` to `utf8`.

## Review Notes
- The `--default-authentication-plugin` flag used in the MySQL 8.0 container was deprecated in MySQL 8.0.34 in favor of `--authentication-policy`. It still works in 8.0.x images but may emit a deprecation warning with newer 8.0 tags. This is acceptable for the migration testing use case described.
- The `SHOW WARNINGS` command after importing via shell redirection (`mysql ... < dump57.sql`) will only show warnings from the last SQL statement executed, not all import warnings. For a complete view, users should check the MySQL error log or use the `--show-warnings` flag with the mysql client. This is a minor usability nuance rather than an error.
- The `mysql:5.7` Docker image is based on Oracle Linux and is only available for `linux/amd64`. Users on ARM-based machines (e.g., Apple Silicon Macs) may need to use `--platform linux/amd64` or an alternative image.
