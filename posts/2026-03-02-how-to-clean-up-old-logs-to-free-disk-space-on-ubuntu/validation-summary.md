# Validation Summary: How to Clean Up Old Logs to Free Disk Space on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- systemd journal / journald
- rsyslog
- logrotate
- Docker logging
- Bash shell commands
- cron

## Sources Consulted
- systemd `journalctl(1)` documentation: https://man7.org/linux/man-pages/man1/journalctl.1%40%40systemd.html
- systemd `journald.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- Local Ubuntu man pages for `journalctl(1)`, `journald.conf(5)`, `systemd.time(7)`, and `logrotate(8)`
- Local CLI help output for `journalctl`, `systemctl`, and `logrotate`
- Docker JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker logging driver configuration documentation: https://docs.docker.com/engine/logging/configure/

## Issues Found
- Replaced the `/var/log/**/*` glob with a `find` command because Bash `globstar` is not enabled by default, so the original command would not reliably inspect nested log directories.
- Added parentheses and `-type f` to `find` expressions that used `-o`, and replaced `xargs` with `-exec ... +` so empty result sets do not accidentally run `ls` or `du` without input.
- Clarified `journalctl --vacuum-*` comments to state that vacuuming operates on archived journal files, matching the `journalctl(1)` documentation.
- Added `sudo mkdir -p /etc/systemd/journald.conf.d` before editing the journald drop-in file because that directory may not already exist.
- Added `sudo` to the Docker log truncation command because `/var/lib/docker/containers` is normally root-owned.
- Clarified that Docker daemon logging limits apply to newly created containers after restart; existing containers keep their previous logging configuration.
- Fixed the cleanup script's `journalctl --disk-usage` parsing because the previous `grep` pattern did not match current systemd output.

## Review Notes
The Docker documentation warns that Docker log files are intended to be accessed by the Docker daemon, so direct truncation should be treated as a pragmatic recovery action rather than routine log management. The post now also includes Docker's supported log rotation configuration.
