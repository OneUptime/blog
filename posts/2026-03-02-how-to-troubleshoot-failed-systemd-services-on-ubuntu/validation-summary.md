# Validation Summary: How to Troubleshoot Failed systemd Services on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- systemd (systemctl, journalctl, systemd-analyze)
- Ubuntu / Linux service management
- nginx, MySQL/MariaDB, Apache (as example services)
- Network diagnostic tools (ss, lsof)
- Process/permission tools (sudo, ls)

## Sources Consulted
- systemd.unit(5) manual page — https://man.archlinux.org/man/systemd.unit.5
- systemctl(1) manual page (--failed, --lines, status, list-dependencies, reset-failed, edit)
- journalctl(1) manual page (-u, -b, -r, -f, --since/--until, -p)
- MySQL 8.0 Reference Manual, Server Configuration Validation — https://dev.mysql.com/doc/refman/8.0/en/server-configuration-validation.html
- MariaDB Server feature request MDEV-23969 (no --validate-config support) — https://jira.mariadb.org/browse/MDEV-23969
- MariaDB Documentation, mariadbd Options — https://mariadb.com/docs/server/server-management/starting-and-stopping-mariadb/mariadbd-options
- Red Hat KB on StartLimitIntervalSec placement — https://access.redhat.com/solutions/3143751
- HashiCorp support on StartLimitIntervalSec section warning — https://support.hashicorp.com/hc/en-us/articles/4406120244755
- nginx, Apache (apachectl), ss/lsof manual pages

## Issues Found

1. **`mysqld --validate-config` claimed to work for MariaDB.** This flag was added in MySQL 8.0.16 and is not implemented in MariaDB (tracked as the unresolved MDEV-23969). On Ubuntu hosts where `mysqld` is a symlink to `mariadbd`, the command would fail. Updated the snippet to label the MySQL 8.0.16+ command correctly and added a MariaDB equivalent using `mariadbd --help --verbose` (which parses config files and exits non-zero on unknown options).

2. **`StartLimitIntervalSec` and `StartLimitBurst` placed in `[Service]` section.** Per `systemd.unit(5)`, these directives belong in the `[Unit]` section. Only the legacy spelling `StartLimitInterval` is silently accepted in `[Service]` for backward compatibility; the modern `StartLimitIntervalSec` name emits an `Unknown lvalue 'StartLimitIntervalSec' in section 'Service'` warning when misplaced. Moved both directives into a `[Unit]` block in the override example and added a brief inline comment explaining the requirement.

## Review Notes
- All `systemctl`, `journalctl`, `systemd-analyze`, `ss`, `lsof`, `nginx -t`, and `apachectl configtest` invocations are correct for current Ubuntu releases (20.04/22.04/24.04).
- Exit code mappings (1, 126, 127, 139=SIGSEGV, 143=SIGTERM, 255) are correct.
- The `MemoryMax=` directive is the current systemd name (replacing legacy `MemoryLimit=`); usage is correct.
- The grep patterns using escaped alternation (`grep -i "permission\|denied\|cannot open"`) are valid BRE syntax and work as written.
- The "Check for issues without starting the service" comment above `daemon-reload` + `journalctl -p err -b` is slightly loose — `daemon-reload` reloads unit files but does not perform a full lint; `systemd-analyze verify` (covered above) is the actual validator. Not technically wrong, just worth tightening in a future revision.
