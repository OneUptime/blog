# Validation Summary: How to Configure PostgreSQL Authentication (pg_hba.conf)

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- pg_hba.conf
- PostgreSQL client authentication
- SCRAM-SHA-256, MD5, peer, trust, and certificate authentication
- PostgreSQL configuration reloads

## Sources Consulted
- PostgreSQL official documentation: The pg_hba.conf File - https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL official documentation: Authentication Methods - https://www.postgresql.org/docs/current/auth-methods.html
- PostgreSQL official documentation: Password Authentication - https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL official documentation: Trust Authentication - https://www.postgresql.org/docs/current/auth-trust.html
- PostgreSQL official documentation: Peer Authentication - https://www.postgresql.org/docs/current/auth-peer.html
- PostgreSQL official documentation: Certificate Authentication - https://www.postgresql.org/docs/current/auth-cert.html
- PostgreSQL official documentation: pg_hba_file_rules - https://www.postgresql.org/docs/current/view-pg-hba-file-rules.html
- PostgreSQL official documentation: File Locations / hba_file - https://www.postgresql.org/docs/current/runtime-config-file-locations.html
- PostgreSQL official documentation: System Administration Functions / pg_reload_conf - https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
- The production example said "Deny everything else" but used `0.0.0.0/0`, which only matches IPv4 connections. Changed the address field to PostgreSQL's documented `all` keyword so the reject rule applies to any IP address.
- The `hostgssenc` connection type was described only as "GSSAPI encrypted", which was imprecise. Updated it to "TCP/IP with GSSAPI encryption only" to match PostgreSQL's connection-type semantics.

## Review Notes
The examples are generally correct for currently supported PostgreSQL versions. `md5` is correctly labeled as legacy; PostgreSQL documentation states support for MD5-encrypted passwords is deprecated and will be removed in a future release. The sample `hba_file` path is Debian/Ubuntu-style and version-specific, but the post correctly uses `SHOW hba_file;` to discover the actual configured path.
