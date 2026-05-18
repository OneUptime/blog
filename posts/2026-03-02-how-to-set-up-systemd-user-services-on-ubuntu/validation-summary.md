# Validation Summary: How to Set Up systemd User Services on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (user manager / `systemctl --user`)
- systemd unit files (`.service`, `.timer`)
- `journalctl` (user-unit log filtering)
- `loginctl` (lingering)
- `systemd-analyze` (unit-paths, verify)
- D-Bus session bus
- Ubuntu (general target distribution)

## Sources Consulted
- systemd.unit(5) — specifiers (`%h`, `%U`), `[Unit]` section options including `StartLimitIntervalSec=` / `StartLimitBurst=` (https://www.man7.org/linux/man-pages/man5/systemd.unit.5.html)
- systemd.service(5) — service options
- systemd.time(7) — calendar event specifications (`OnCalendar=`) (https://man7.org/linux/man-pages/man7/systemd.time.7.html)
- systemd-analyze(1) — `unit-paths`, `verify` (https://man7.org/linux/man-pages/man1/systemd-analyze.1.html)
- journalctl(1) — `--user-unit` (https://man7.org/linux/man-pages/man1/journalctl.1.html)
- loginctl(1) — `enable-linger` / `disable-linger` (https://man7.org/linux/man-pages/man1/loginctl.1.html)
- ArchWiki: systemd/User (https://wiki.archlinux.org/title/Systemd/User)
- freedesktop systemd-devel mailing list — note on `StartLimit*` move from `[Service]` to `[Unit]` in systemd 230

## Issues Found
1. **Incorrect `%h` usage in path prefixes.** The `%h` specifier expands to the user's full home directory (e.g., `/home/alice`), not the username. The post wrote `WorkingDirectory=/home/%h/www`, `WorkingDirectory=/home/%h/myapp`, and `ExecStart=/home/%h/scripts/backup.sh`, all of which would expand to a malformed double path like `/home//home/alice/www`. Fixed by removing the leading `/home/` so these become `%h/www`, `%h/myapp`, and `%h/scripts/backup.sh` respectively. The Python `ExecStart --directory /home/user/www` was also changed to `--directory %h/www` for consistency with the corrected `WorkingDirectory` in the same unit.
2. **`StartLimitIntervalSec=` and `StartLimitBurst=` placed in `[Service]`.** Per systemd.unit(5), these directives belong in the `[Unit]` section. They were moved from `[Service]` to `[Unit]` in systemd 230 (Ubuntu 16.10+ ships with newer versions and would emit a deprecation warning if left in `[Service]`). Moved both directives to the `[Unit]` section of the Node.js example.
3. **`OnCalendar=daily` does not run at 2 AM.** Per systemd.time(7), the `daily` shorthand expands to `*-*-* 00:00:00` (midnight). The accompanying comment said "Run daily at 2 AM". Replaced with the explicit calendar spec `OnCalendar=*-*-* 02:00:00` so the timer actually fires at the documented time.

## Review Notes
- `After=default.target` on a user service is uncommon but not incorrect — it simply orders the service after the user manager reaches its default target. Left as-is since it does not affect correctness.
- `After=network.target` on a user service is mostly redundant (the network is already up by the time the user manager starts on login, and `network.target` is not the user manager's own target), but it is harmless. Left as-is.
- `loginctl show-user $USER | grep Linger` works, but `loginctl show-user $USER --property=Linger` would be a slightly more robust query. Left as-is since the original is functional.
- `EnvironmentFile=-%h/.config/myapp/env` correctly uses the leading dash to mark the file as optional — verified per systemd.exec(5).
- `Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/%U/bus` is correct; `%U` expands to the user's numeric UID and `/run/user/<UID>/bus` is the standard XDG runtime DBus socket path on systemd-logind systems.
