# Validation Summary: How to Deploy MariaDB via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MariaDB 11 (Docker official image)
- Portainer (Stacks / Docker Compose deployment)
- Docker Compose (v3.8 schema)
- WordPress (as example app integration)
- mysqldump / mysql CLI (backup and restore)
- MariaDB server configuration (my.cnf / server.cnf)

## Sources Consulted
- Official MariaDB Docker image documentation: https://hub.docker.com/_/mariadb
- MariaDB Docker image GitHub repo and `healthcheck.sh` script: https://github.com/MariaDB/mariadb-docker
- MariaDB Knowledge Base — Server System Variables: https://mariadb.com/kb/en/server-system-variables/
- MariaDB Knowledge Base — GRANT statement: https://mariadb.com/kb/en/grant/
- MariaDB Knowledge Base — mariadb-dump (mysqldump): https://mariadb.com/kb/en/mariadb-dumpmysqldump/
- Docker Compose specification — depends_on with condition: https://docs.docker.com/compose/compose-file/05-services/#depends_on
- WordPress Docker image documentation: https://hub.docker.com/_/wordpress
- Portainer documentation — Stacks: https://docs.portainer.io/user/docker/stacks

## Issues Found
No technical issues found.

Verified specifically:
- `MARIADB_ROOT_PASSWORD`, `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD`, and `MARIADB_ROOT_HOST` are all valid environment variables documented for the official MariaDB Docker image.
- The bundled `healthcheck.sh` script in the MariaDB image supports the `--su-mysql`, `--connect`, and `--innodb_initialized` flags as used in the post.
- All `[mysqld]` configuration directives (`innodb_buffer_pool_size`, `innodb_log_file_size`, `innodb_flush_method`, `character-set-server`, `collation-server`, `max_connections`, `max_allowed_packet`, `slow_query_log`, `long_query_time`, `log_bin`, `expire_logs_days`, `max_binlog_size`) are valid MariaDB system variables.
- The combined `GRANT ... IDENTIFIED BY` syntax is still supported in MariaDB 10.x/11.x (unlike MySQL 8.0, where it was removed).
- WordPress environment variables (`WORDPRESS_DB_HOST`, `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WORDPRESS_DB_NAME`) match the official WordPress Docker image.
- `mysqldump` and `mysql` commands remain available in the MariaDB image (as compatibility symlinks for `mariadb-dump` and `mariadb`).
- `mariadb --version` is the canonical client-version command in MariaDB 11.

## Review Notes
- The Docker Compose top-level `version: "3.8"` field is obsolete in modern Compose (v2+) but is still parsed without error; leaving it as-is is fine.
- `expire_logs_days` still works but `binlog_expire_logs_seconds` is the preferred newer setting in MariaDB 10.6+. Either is acceptable.
- `GRANT ... IDENTIFIED BY` is supported by MariaDB but the more modern pattern is `CREATE USER ... IDENTIFIED BY ...; GRANT ... ON ... TO ...;`. Not incorrect, just stylistic.
- The in-place upgrade note (10.x → 11) is broadly correct for the Docker image (which runs `mariadb-upgrade` on first start when needed); a major-version jump still warrants a verified backup, which the post correctly calls out.
