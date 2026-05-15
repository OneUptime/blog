# Validation Summary: How to Set Up PostgreSQL Streaming Replication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- PostgreSQL streaming replication
- PostgreSQL WAL configuration
- PostgreSQL `pg_basebackup`
- PostgreSQL host-based authentication
- firewalld

## Sources Consulted
- PostgreSQL documentation: `pg_basebackup` options, including `-R`, `-Fp`, `-Xs`, and `-P`: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation: replication settings including `max_wal_senders`, `wal_keep_size`, `primary_conninfo`, and `hot_standby`: https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL documentation: log-shipping standby and streaming replication setup: https://www.postgresql.org/docs/16/warm-standby.html
- PostgreSQL documentation: `pg_hba.conf` format and `scram-sha-256` authentication: https://www.postgresql.org/docs/15/auth-pg-hba-conf.html
- PostgreSQL 13 documentation: `password_encryption` default behavior relevant to older RHEL PostgreSQL packages: https://www.postgresql.org/docs/13/runtime-config-connection.html
- Red Hat Enterprise Linux documentation: firewalld services and `firewall-cmd`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- firewalld manual page for `firewall-cmd`: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The replication user was created without forcing SCRAM password storage, while `pg_hba.conf` required `scram-sha-256`. This can fail on PostgreSQL versions where `password_encryption` defaults to `md5`, including PostgreSQL 13. I changed the role creation command to set `password_encryption = 'scram-sha-256'` for that session before creating the role.
- The standby verification step assumed `pg_basebackup -R` would always write `password=replpass123` into `primary_conninfo`. PostgreSQL documentation requires a password either in `primary_conninfo` or in a standby `.pgpass` file when password authentication is used, and `pg_basebackup -R` records connection settings rather than guaranteeing an interactive password prompt is persisted. I changed the expected `primary_conninfo` example and added a `.pgpass` command for the standby.

## Review Notes
- The tutorial uses modern PostgreSQL standby setup with `standby.signal` and `postgresql.auto.conf`, which is correct for PostgreSQL 12 and later.
- `wal_keep_size` is valid for current PostgreSQL releases, but older PostgreSQL 12 and earlier tutorials may use `wal_keep_segments` instead.
- The generic RHEL service and data directory names shown are typical for RHEL-packaged PostgreSQL, but installations from PostgreSQL community repositories may use versioned service names and data paths.
