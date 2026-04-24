# Validation Summary: How to Configure PostgreSQL Host-Based Auth for Remote IPv4 Clients

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL 16
- `postgresql.conf`
- `pg_hba.conf`
- `psql`
- UFW
- `iptables`
- `ss`

## Sources Consulted
- PostgreSQL 16 documentation: Connections and Authentication — https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL 16 documentation: The `pg_hba.conf` File — https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 documentation: Password Authentication — https://www.postgresql.org/docs/16/auth-password.html
- PostgreSQL 16 documentation: `CREATE ROLE` — https://www.postgresql.org/docs/16/sql-createrole.html
- PostgreSQL 16 documentation: `pg_hba_file_rules` — https://www.postgresql.org/docs/16/view-pg-hba-file-rules.html
- PostgreSQL 16 documentation: Predefined Roles — https://www.postgresql.org/docs/16/predefined-roles.html
- Ubuntu Server documentation: Firewalls — https://ubuntu.com/server/docs/how-to/security/firewalls/
- Ubuntu `ufw` man page — https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html

## Issues Found
- The introduction described `pg_hba.conf` as "authorization". I changed that to "client authentication rules" because `pg_hba.conf` controls connection matching and authentication method selection, not SQL authorization.
- The post used `listen_addresses = '*'` as the primary IPv4 example and described it as required in the conclusion. PostgreSQL documents that `listen_addresses` only needs to include the relevant address, and `0.0.0.0` is the explicit all-IPv4 form, so I changed the example and corrected the conclusion.
- One `pg_hba.conf` example used `md5`. Current PostgreSQL documentation describes MD5 as less secure and documents migration to `scram-sha-256`, so I replaced that example with `scram-sha-256`.
- The SQL used `CREATE USER ... WITH ENCRYPTED PASSWORD`. In current PostgreSQL, the `ENCRYPTED` keyword has no effect and is accepted only for backward compatibility, so I changed both role-creation examples to `WITH PASSWORD`.
- The schema/table/sequence grants were being executed immediately after `CREATE DATABASE appdb` while still connected to the original database. I added `\c appdb` so those grants run against the intended database.
- The `pg_hba_file_rules` check was described as verifying that `pg_hba.conf` is loaded. PostgreSQL documents that this view reports the current file contents, not what was last loaded by the server, so I changed the wording to "Reload configuration and inspect pg_hba.conf rules".
- The UFW examples did not specify TCP. I made them protocol-specific to match PostgreSQL's TCP listener and the documented UFW syntax.
- The unauthorized-host test expected `no pg_hba.conf entry`, but the post also configures a final explicit `reject` rule. I changed the expected result to a generic rejection by `pg_hba.conf`, which matches the configured behavior.

## Review Notes
- The file paths `/etc/postgresql/16/main/...` and the `postgresql` systemd service name are Debian/Ubuntu packaging conventions. They are accurate for that layout, but not universal across all PostgreSQL installations.
- The table and sequence grants shown apply to existing objects in `public`. If future objects will be created by a different role, a follow-up improvement would be to document `ALTER DEFAULT PRIVILEGES` or an ownership-based setup.
- The post assumes PostgreSQL 16 defaults for password storage. If `password_encryption` has been changed from the default `scram-sha-256`, passwords may need to be reset before `scram-sha-256` authentication will succeed.
