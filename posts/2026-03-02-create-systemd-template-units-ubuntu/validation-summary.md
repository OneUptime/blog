# Validation Summary: How to Create systemd Template Units on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- systemd template units and service units
- systemctl
- journalctl
- OpenVPN
- PostgreSQL / pg_ctl
- Python http.server
- Bash
- socat

## Sources Consulted
- systemd.unit official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service official documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- systemctl official documentation: https://www.freedesktop.org/software/systemd/man/systemctl.html
- systemd.exec official documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd.resource-control official documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.resource-control.html
- journalctl official documentation: https://www.freedesktop.org/software/systemd/man/247/journalctl.html
- systemd-escape manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-escape.html
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- PostgreSQL pg_ctl documentation: https://www.postgresql.org/docs/current/app-pg-ctl.html
- Python http.server documentation: https://docs.python.org/3/library/http.server.html

## Issues Found
- Corrected the `%N` specifier description. It removes the unit type suffix from the full unit name; it is not the unescaped form of `%n`.
- Corrected the `%u` specifier description. It expands to the user running the service manager, not necessarily the `User=` configured for the service process.
- Clarified that `systemctl status "worker@*.service"` and `systemctl restart "worker@*.service"` operate on loaded/matching units, because glob patterns are matched against units currently known to systemd.
- Renamed the PostgreSQL example from databases to clusters and clarified that each cluster needs its own port configured in `postgresql.conf`.
- Removed `/usr/bin/postgresql-check-db-dir` from the PostgreSQL example because it is not a standard Ubuntu PostgreSQL helper.
- Replaced the URL-encoding guidance for complex instance names with `systemd-escape`, which matches systemd's escaping model.
- Escaped Bash variables in the proxy `ExecStart=` command as `$$src`, `$$host`, and `$$dst` so systemd passes literal dollar signs through to Bash instead of expanding them as systemd environment variables.

## Review Notes
The examples are generally valid as illustrative templates, but they assume supporting binaries, users, directories, configuration files, and PostgreSQL/OpenVPN versions are installed and prepared. The PostgreSQL example references PostgreSQL 16 paths, which are correct only when the PostgreSQL 16 packages are installed.
