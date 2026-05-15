# Validation Summary: How to Install and Configure PostgreSQL on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- PostgreSQL
- DNF
- systemd
- firewalld
- SQL

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using PostgreSQL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- PostgreSQL documentation, "The pg_hba.conf File": https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL documentation, "Password Authentication": https://www.postgresql.org/docs/current/auth-password.html
- firewalld documentation, "firewall-cmd": https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post said PostgreSQL uses `ident` authentication for local connections. PostgreSQL distinguishes local Unix socket connections from TCP connections: `peer` is used for local socket records, while `ident` applies to TCP records. I updated the wording to describe `peer` for local Unix socket connections and `ident` for loopback TCP connections.
- The post changed `pg_hba.conf` entries to `scram-sha-256` but did not set `password_encryption = scram-sha-256` before creating or changing passwords. I added that setting to the `postgresql.conf` example so new passwords are stored in a form compatible with SCRAM authentication.

## Review Notes
- The `GRANT ALL PRIVILEGES ON DATABASE myappdb TO myapp;` command is redundant when `myapp` already owns `myappdb`, but it is valid SQL and was left unchanged.
- The firewall command assumes the predefined `postgresql` firewalld service is available on the RHEL system.
