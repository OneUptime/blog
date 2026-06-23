# Validation Summary: How to Manage Ubuntu Servers with systemd

## Status
validated

## Post Type
Tutorial / Guide (comprehensive reference for managing services with systemd on Ubuntu)

## Technologies Covered
- systemd (init system and service manager)
- systemctl (service management CLI)
- systemd unit files (.service, .timer, .target, templates)
- systemd timers (OnCalendar, monotonic timers)
- journald / journalctl (logging)
- cgroups resource control (Memory*, CPU*, IO*, Tasks*, Limit* directives)
- systemd security hardening directives (Protect*, NoNewPrivileges, SystemCallFilter, etc.)

## Sources Consulted
- systemd.unit(5) — unit load path precedence and dependency directives (Requires, Wants, BindsTo, PartOf, Conflicts, After/Before): https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.service(5) — service options, Type=, Restart=, Exec*: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.exec(5) / systemd.resource-control(5) — cgroup limits, security sandboxing: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- systemd.timer(5) and systemd.time(7) — OnCalendar syntax, monotonic timers: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- journalctl(1) and journald.conf(5): https://www.freedesktop.org/software/systemd/man/journalctl.html
- systemd exit codes (EXIT_EXEC=203, EXIT_USER=217) from systemd.exec(5) "Process Exit Codes"

## Issues Found
1. **Unit file location priority was backwards.** The post labeled `/run/systemd/system/` as "highest priority" and `/etc/systemd/system/` as merely "higher priority." Per systemd's load path precedence, `/etc/systemd/system/` is the highest priority (overriding both `/run` and `/lib`), with `/run` overriding `/lib`. Corrected the comments and reordered the listing to reflect `/lib` (lowest) → `/run` → `/etc` (highest).

2. **`StartLimitBurst` / `StartLimitIntervalSec` placed in the `[Service]` section (basic service example).** These directives belong in the `[Unit]` section (they were moved out of `[Service]` in systemd v229/230; placing them in `[Service]` produces a warning and is ignored as restart-limit settings). Moved them into the `[Unit]` section with a clarifying comment.

3. **`StartLimitBurst` / `StartLimitIntervalSec` / `StartLimitAction` placed in `[Service]` (Service Recovery Options example).** Same issue as #2. Moved these three directives into a `[Unit]` section, leaving `Restart=`, `RestartSec=`, and `ExecStopPost=` (which are correct `[Service]` options) in `[Service]`.

4. **Inaccurate `BindsTo` description.** The comment claimed `BindsTo` "also orders this unit after the required units." `BindsTo` does not create ordering on its own; it is a stronger form of `Requires` where the unit is also stopped if the bound unit stops/fails for any reason (including outside systemd). Corrected the comment and noted that `After=` is still needed for ordering.

5. **Missing Markdown heading for "Resource Limits with cgroups."** The section title appeared as plain text without the `##` prefix, which broke the Table of Contents anchor link (`#resource-limits-with-cgroups`). Restored the `##` heading.

## Review Notes
- `CPUWeight=idle` (used in the CPU Limits example) is valid but only since systemd v252. Current Ubuntu LTS releases (24.04 ships systemd 255) support it; on older systemd it will be rejected. Not changed, but worth a version caveat for readers on older releases.
- The `IOReadBandwidthMax`/`IOWriteBandwidthMax`/`IO*IOPSMax` and `AllowedCPUs` directives require the unified (v2) cgroup hierarchy, which is the default on modern Ubuntu — accurate as written.
- Template-unit `Environment=PORT=300%i` only yields the described ports (3001, 3002) for single-character instance names; multi-digit instances would not map cleanly. This is a reasonable simplification for the example and was left as-is.
- All other systemctl/journalctl commands, exit-code interpretations (203 = exec failure, 217 = failed to change user/group, 137 = 128+SIGKILL), OnCalendar shorthands (hourly/daily/weekly/monthly), and journald.conf keys were verified against the man pages and are correct.
