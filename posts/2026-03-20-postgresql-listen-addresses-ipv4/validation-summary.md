# Validation Summary: How to Configure PostgreSQL listen_addresses for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL
- PostgreSQL server configuration (`postgresql.conf`, `pg_hba.conf`)
- `psql`
- Linux networking and firewall tools (`ss`, `nc`, `ufw`, `iptables`, `systemctl`)

## Sources Consulted
- PostgreSQL documentation: Connection Settings (`listen_addresses`, `port`) https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL documentation: `pg_hba.conf` record types and reload behavior https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL documentation: Password authentication and MD5 deprecation https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL documentation: `psql` command-line options and `ON_ERROR_STOP` https://www.postgresql.org/docs/current/app-psql.html
- Local CLI/manpage help: `ss --help`, `man nc`, `man ufw`, `man iptables`, `systemctl --help`

## Issues Found
- The introduction said `listen_addresses = 'localhost'` accepts only local socket connections. PostgreSQL documents `listen_addresses` as controlling TCP/IP listeners; the default `localhost` allows only local TCP/IP loopback connections, while Unix-domain sockets are configured separately.
- The `localhost` row in the value table was too broad. It was corrected to say local TCP/IP loopback only.
- The `pg_hba.conf` examples used `md5` authentication for general password-based access. PostgreSQL documents MD5-encrypted password support as deprecated, so those examples were updated to `scram-sha-256`.
- The first `pg_hba.conf` example reused the server listen IP as a client source IP, which is misleading in an access-control example. It was changed to a distinct client IP.
- The comment above `systemctl restart postgresql` said "Reload PostgreSQL". It was corrected to "Restart PostgreSQL", and the later reload note was clarified to apply when only `pg_hba.conf` changes.
- The UFW example omitted `proto tcp`, which would allow unnecessary UDP traffic on port `5432`. It was tightened to a TCP-only rule.
- The example `ss` and `nc` output comments were too literal for commands whose output varies by platform and configuration. They were rewritten to describe the expected successful condition instead of one exact output string.

## Review Notes
- The `/etc/postgresql/16/main/...` paths and `postgresql` systemd service name are Debian/Ubuntu-style examples, not universal PostgreSQL installation paths.
- The `hostssl` example is valid, but it only matches if PostgreSQL is built with SSL support and `ssl = on`.
