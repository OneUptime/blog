# Validation Summary: How to Set Up PostgreSQL Streaming Replication on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- PostgreSQL
- PostgreSQL streaming replication
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing PostgreSQL, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- PostgreSQL 13 documentation: Log-Shipping Standby Servers, https://www.postgresql.org/docs/13/warm-standby.html
- PostgreSQL 13 documentation: pg_basebackup, https://www.postgresql.org/docs/13/app-pgbasebackup.html
- PostgreSQL 13 documentation: Replication configuration, https://www.postgresql.org/docs/13/runtime-config-replication.html
- PostgreSQL 13 documentation: The pg_hba.conf File, https://www.postgresql.org/docs/13/auth-pg-hba-conf.html
- PostgreSQL 13 documentation: Password Authentication, https://www.postgresql.org/docs/13/auth-password.html
- firewalld documentation: firewall-cmd manual page, https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post title and summary claimed to set up PostgreSQL streaming replication, but the body contained generic database setup steps and unrelated MariaDB/MySQL commands. I replaced those unrelated commands with PostgreSQL primary/standby replication steps.
- The prerequisites described a single RHEL 9 system, which is insufficient for a primary/standby streaming replication walkthrough. I changed this to two RHEL 9 systems and added the required network connectivity to the primary on port 5432.
- The configuration section did not include replication settings. I added `listen_addresses`, `wal_level`, `max_wal_senders`, and `wal_keep_size`, plus a `pg_hba.conf` replication entry for the standby host.
- The user/database creation step created an application user and database instead of a replication role. I replaced it with a replication role using `REPLICATION LOGIN` and SCRAM password encryption.
- The verification step only checked generic database connectivity. I replaced it with checks against `pg_stat_replication` on the primary and `pg_is_in_recovery()` on the standby.

## Review Notes
The tutorial now covers basic asynchronous physical streaming replication. Future improvements could include replication slots, TLS, `.pgpass` usage for noninteractive `pg_basebackup`, failover handling, and tuning values for production workloads.
