# Validation Summary: How to Configure pg_hba.conf for IPv4 Host-Based Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- `pg_hba.conf`
- PostgreSQL client authentication
- `psql`
- systemd/Linux service management

## Sources Consulted
- PostgreSQL documentation: The `pg_hba.conf` File — https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL documentation: Authentication Methods — https://www.postgresql.org/docs/current/auth-methods.html
- PostgreSQL documentation: Password Authentication — https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL documentation: `psql` — https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL documentation: System Administration Functions (`pg_reload_conf`) — https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation: System Information Functions (`pg_conf_load_time`) — https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL documentation: `pg_hba_file_rules` — https://www.postgresql.org/docs/current/view-pg-hba-file-rules.html

## Issues Found
1. **Incorrect first-match explanation and rule format**: The post simplified `pg_hba.conf` matching as “the first matching rule determines whether access is granted” and showed a single `TYPE DATABASE USER ADDRESS METHOD` format even though `local` records do not have an address field. Updated the explanation to match PostgreSQL’s actual behavior: the first matching record is used for authentication and there is no fall-through. Corrected the format block to distinguish `local` from `host`-style records.

2. **Incorrect and outdated authentication-method guidance**: The post said `trust` was local-only, and treated `md5` as a normal current password method. PostgreSQL supports `trust` on host records as well, and current PostgreSQL documentation marks MD5-encrypted passwords as deprecated. Updated the method notes to remove the false `trust` limitation, mark `md5` as deprecated, and recommend `scram-sha-256` for new deployments.

3. **Deprecated password method used in generic examples**: The subnet example and rule-ordering examples used `md5` without any compatibility caveat. Replaced those examples with `scram-sha-256` so the post uses current recommended authentication configuration.

4. **Misleading comments in example rules**: The `local ... peer` example was described as “trust for postgres user”, which contradicted the actual rule. The replication example comment also described the rule as a “read-only replica user” case, even though the special `replication` database target is for replication connections. Updated both comments to match PostgreSQL behavior.

5. **Reload verification command did not verify a reload**: `SELECT now();` only confirms that a connection works; it does not confirm that PostgreSQL reloaded its configuration. Replaced it with `SELECT pg_conf_load_time();`, which reports when the configuration files were last loaded.

6. **Incorrect source-IP testing example**: The post claimed `psql -h 10.0.0.5 ...` could “simulate” connecting from a specific client IP. In `psql`, `-h` selects the server host, not the client source address. Updated the text to explain that the command must be run from the client host whose IP is being matched, and changed the command example accordingly.

7. **`pg_hba_file_rules` description was too loose**: The post said this query would “View pg_hba.conf in PostgreSQL”, but the view exposes PostgreSQL’s parsed rule view of the file rather than the raw file contents. Updated the wording to describe it accurately.

## Review Notes
- The post is valid as a Linux/Debian-style guide: `/etc/postgresql/16/main/pg_hba.conf`, `systemctl reload postgresql`, and `/var/log/postgresql/postgresql-16-main.log` are packaging-specific examples rather than universal PostgreSQL paths or service names.
- Remote IPv4 access also depends on `listen_addresses`; `pg_hba.conf` controls client authentication rules, but it does not by itself make PostgreSQL listen on non-local TCP addresses.
- Current PostgreSQL documentation as of April 24, 2026 points readers to supported versions 14 through 18, and MD5-encrypted passwords are deprecated across current supported releases.
