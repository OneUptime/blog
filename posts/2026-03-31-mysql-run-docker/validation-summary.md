# Validation Summary: How to Run MySQL with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Docker (Engine 20.10+, CLI)
- Docker Compose V2
- SQL (DDL and DML)

## Sources Consulted
- Official MySQL Docker image documentation: https://hub.docker.com/_/mysql
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Authentication Plugin deprecation (8.0.34 release notes): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-34.html
- Docker Compose Specification: https://docs.docker.com/compose/compose-file/
- MySQL CLI connection options: https://dev.mysql.com/doc/refman/8.0/en/connecting.html

## Issues Found

1. **Removed obsolete `version: "3.9"` from Docker Compose file.** Docker Compose V2 (used in the post via `docker compose`) no longer requires or uses the `version` key — it follows the Compose Specification directly. The `version` field was producing an obsolete warning. Removed the line to match current best practice.

2. **Removed deprecated `--default-authentication-plugin=mysql_native_password` from Docker Compose `command:`.** The `--default-authentication-plugin` option was deprecated in MySQL 8.0.34. Since `mysql:8.0` resolves to the latest 8.0.x patch (which is >= 8.0.34), this flag produces a deprecation warning. The default authentication plugin `caching_sha2_password` is more secure and is fully supported by the `mysql` CLI client used in the post's connection examples. Removed the `command:` directive entirely so the container uses the secure default.

## Review Notes
- The `mysql -h 127.0.0.1 -P 3306 -u appuser -p myapp` command is correct: `-p` with a space prompts for the password interactively, and `myapp` is the positional database name argument per `mysql [options] [db_name]` syntax. This is the recommended approach (avoids exposing passwords on the command line).
- The post recommends pinning a specific image tag in production (e.g., `mysql:8.0.36`) but uses `mysql:8.0` in examples. This is fine for a development-focused tutorial.
- The initialization scripts section correctly notes that scripts only run when the data directory is empty (first start). The Docker MySQL image also supports `.sql.gz`, `.sql.bz2`, `.sql.xz`, and `.sql.zst` files, but the post's mention of `.sql` and `.sh` covers the most common use cases.
- For readers who specifically need `mysql_native_password` (e.g., for legacy client compatibility), they can add `command: --authentication-policy=mysql_native_password` to the Compose file, which is the non-deprecated replacement in MySQL 8.0.34+.
