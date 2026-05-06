# Validation Summary: How to Configure Database Backups over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- MySQL and MariaDB
- MongoDB
- IPv6
- SSH
- Bash
- Cron

## Sources Consulted
- PostgreSQL documentation: `pg_dump` - https://www.postgresql.org/docs/16/app-pgdump.html
- PostgreSQL documentation: `pg_basebackup` - https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation: connection settings (`listen_addresses`) - https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL documentation: `pg_hba.conf` IPv6 address matching - https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- MySQL Reference Manual: `mysqldump` - https://dev.mysql.com/doc/refman/en/mysqldump.html
- MySQL Reference Manual: connecting using the IPv6 local host address - https://dev.mysql.com/doc/refman/8.4/en/ipv6-local-connections.html
- MySQL Reference Manual: configuring the server to permit IPv6 connections - https://dev.mysql.com/doc/refman/8.0/en/ipv6-server-config.html
- MongoDB Database Tools documentation: `mongodump` - https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Server documentation: `mongod` IPv6 binding - https://www.mongodb.com/docs/manual/reference/program/mongod/
- Local OpenSSH client check: `ssh -G 'backupuser@[2001:db8::backup]'` to confirm bracketed IPv6 SSH target syntax is accepted in this environment

## Issues Found
- The MySQL example for backing up a specific database used `mysqldump -h "[2001:db8::db]"`, but MySQL's documented client syntax uses the IPv6 literal directly with `-h`/`--host` (for example, `mysql -h ::1`). I changed the example to `-h 2001:db8::db`.
- The note saying "MySQL uses [] notation for IPv6 addresses" was incorrect for the `-h`/`--host` option. I replaced it with a note that brackets are for URIs/connection strings, not MySQL's host option.
- The automated backup script repeated the same incorrect MySQL host syntax with `-h "[$DB_HOST]"`. I changed it to `-h "$DB_HOST"`.
- The closing explanation generalized bracket usage too broadly. I updated it so it distinguishes between URI/connection-string syntax and MySQL's `-h`/`--host` syntax.

## Review Notes
- PostgreSQL examples are technically sound. `pg_dump` and `pg_basebackup` both accept `-h`/`--host`, `pg_hba.conf` accepts IPv6 CIDR entries, and `listen_addresses` accepts comma-separated IPv4/IPv6 addresses.
- The `pg_basebackup -Ft --wal-method=stream` example is valid: in tar format, the base backup is written as tar files in the target directory, and streamed WAL is written separately.
- MongoDB examples are valid for IPv6 syntax. `mongodump` supports bracketed IPv6 literals when using `--host` with address/port syntax, and `--gzip` with `--archive` is supported.
- For MongoDB replica sets under active writes, `mongodump --oplog` is relevant if point-in-time consistency is required. The post's examples remain valid, but that consistency caveat is worth keeping in mind for production backup strategy.
- The workspace does not have `pg_dump`, `pg_basebackup`, `mysqldump`, or `mongodump` installed, so command-level verification for those tools was performed against official vendor documentation rather than local `--help` output. `validation.json` can be validated locally with `jq`.
