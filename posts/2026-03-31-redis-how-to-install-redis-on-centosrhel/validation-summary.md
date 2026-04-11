# Validation Summary: How to Install Redis on CentOS/RHEL

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Redis (server and CLI)
- CentOS 7 / RHEL 7 (yum-based)
- CentOS 8 / RHEL 8 / AlmaLinux / Rocky Linux (dnf-based)
- RHEL 9 / CentOS Stream 9
- Remi RPM repository
- RHEL AppStream repository
- systemd service management
- firewalld
- SELinux

## Sources Consulted
- Redis official download page: https://redis.io/downloads/
- Redis official configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Remi's RPM repository: https://rpms.remirepo.net/
- RHEL 8 AppStream documentation (Red Hat)
- firewalld rich rule syntax documentation
- SELinux `semanage` port and fcontext usage

## Issues Found

1. **Misleading comment on `bind` directive**: The comment said "Bind to all interfaces (or specific IP for security)" but the actual value `bind 127.0.0.1` restricts Redis to localhost only, which is the opposite of binding to all interfaces. Fixed the comment to "Bind to localhost only (recommended for security)".

2. **SELinux `semanage port` example used the default port**: The comment said "If using a custom port, add the context" but the command used port 6379, which is the default Redis port already labeled as `redis_port_t` in the default RHEL SELinux policy. Running `semanage port -a` on an already-defined port would produce an error. Changed the example port to 6380 to correctly illustrate adding a custom port context.

## Review Notes
- CentOS 7 reached End of Life on June 30, 2024. The CentOS 7 instructions may still work via vault mirrors but the base repos are no longer actively maintained. A note about EOL status could be helpful in a future update.
- The `redis_enable_notify` SELinux boolean (`setsebool -P redis_enable_notify 1`) may not be present in all RHEL/CentOS SELinux policies. Its availability depends on the version of `selinux-policy-targeted` installed. Users should verify with `getsebool -a | grep redis` before running the command.
- Using `-a` (password) on the `redis-cli` command line will produce a warning: "Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe." This is expected behavior and not an error, but readers should be aware they can use `--askpass` or `AUTH` inside the CLI session as alternatives.
- The compile-from-source section uses `yum` which works on EL8/9 (as a symlink to `dnf`) but `dnf` is the canonical package manager for those versions.
