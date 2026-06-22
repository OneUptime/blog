# Validation Summary: How to Run MySQL and MariaDB in Docker with Proper Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- MySQL official Docker image
- MariaDB official Docker image
- MySQL and MariaDB configuration files
- SQL initialization scripts
- mysqldump backup and restore

## Sources Consulted
- MySQL Official Image documentation: https://hub.docker.com/_/mysql
- MariaDB Official Image documentation: https://hub.docker.com/_/mariadb
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- MySQL 8.4 Reference Manual, Native Pluggable Authentication: https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html
- MySQL 8.4 Reference Manual, CREATE USER Statement: https://dev.mysql.com/doc/refman/8.4/en/create-user.html
- MySQL 8.0 Reference Manual, added/deprecated/removed options: https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html
- MariaDB Server Docker Official Images healthcheck guidance: https://mariadb.org/mariadb-server-docker-official-images-healthcheck-without-mysqladmin/
- Local verification with `docker run --rm mysql:8 --verbose --help`
- Local verification with `docker run --rm mariadb:11 --verbose --help`

## Issues Found
- Removed obsolete `version: '3.8'` keys from Docker Compose examples. Docker Compose now treats the top-level `version` property as obsolete and only informative.
- Replaced deprecated MySQL `expire_logs_days = 7` with `binlog_expire_logs_seconds = 604800`. MySQL 8.0 documentation marks `expire_logs_days` as deprecated.
- Updated initialization shell scripts to choose `mariadb` in MariaDB containers and `mysql` in MySQL containers. Current `mariadb:11` includes the `mariadb` client but not the legacy `mysql` client name.
- Updated initialization shell scripts to use either `MYSQL_*` or `MARIADB_*` environment variables so the examples work for both image families.
- Corrected connection string examples to use the configured password `mypassword` instead of the placeholder `password`.
- Changed the container-to-container Compose dependency from `service_healthy` to `service_started` because that snippet did not define a healthcheck for the MySQL service.
- Added MariaDB-specific `docker exec` examples using the `mariadb` client and `mariadb` container name.
- Scoped the `--default-authentication-plugin=mysql_native_password` example to `mysql:8.0` and added a caveat that `mysql_native_password` is deprecated in MySQL 8.0.34, disabled by default in MySQL 8.4, and removed in MySQL 9.0.
- Replaced unsafe troubleshooting advice to delete `ib_logfile*` with safer guidance to check logs, allow clean recovery, and restore from backup if redo logs are corrupt.

## Review Notes
- The general Docker image environment variables, volume paths, `/docker-entrypoint-initdb.d/` behavior, Docker secrets pattern, MariaDB `healthcheck.sh` usage, and `mysqldump` backup/restore examples match the official image documentation.
- The memory tuning table is a rule-of-thumb rather than an official sizing formula. It is acceptable as guidance, but future revisions could clarify workload-dependent tuning.
