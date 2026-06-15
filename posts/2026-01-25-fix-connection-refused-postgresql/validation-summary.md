# Validation Summary: How to Fix 'connection refused' Errors in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL
- psql and pg_isready
- PostgreSQL postgresql.conf and pg_hba.conf
- Linux systemd, firewalld, ufw, iptables, ss, netstat, lsof, nc, telnet
- macOS Homebrew services
- Windows PowerShell service management and pg_ctl
- AWS EC2 security groups and AWS CLI
- Python psycopg2

## Sources Consulted
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/current/app-pg-isready.html
- PostgreSQL connection settings documentation: https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL pg_hba.conf documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL libpq connection string documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- psycopg2 module documentation: https://www.psycopg.org/docs/module.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- AWS CLI authorize-security-group-ingress documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- PostgreSQL wiki Homebrew installation notes: https://wiki.postgresql.org/wiki/Homebrew

## Issues Found
- Clarified that raw TCP "connection refused" usually means the server is not listening or a firewall/network device is rejecting the connection, while `pg_hba.conf` failures normally appear as PostgreSQL `FATAL` authentication errors after the server is reachable.
- Updated the diagnostic flowchart to include socket settings alongside `pg_hba.conf` for local connection failures.
- Fixed the iptables persistence command from `sudo iptables-save > /etc/iptables/rules.v4` to `sudo sh -c 'iptables-save > /etc/iptables/rules.v4'` so the privileged redirection works.
- Fixed the troubleshooting script to check the user-supplied `$PORT` instead of hard-coding port 5432 in the local listening-port check.

## Review Notes
The Homebrew log path and PostgreSQL service names are version- and installation-specific examples. They are plausible as examples, but future updates could note Apple Silicon Homebrew paths and newer PostgreSQL major versions.
