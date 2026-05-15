# Validation Summary: How to List All Running Services and Their States on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd
- systemctl
- systemd-analyze
- Bash shell commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- systemctl(1) manual page: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd.service(5) manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd-analyze(1) manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html
- Local `systemctl --help`, `systemctl --state=help`, and `systemd-analyze --help` output from systemd 255 for command syntax cross-checking.

## Issues Found
- `systemctl list-units --type=service --all` was described as including units installed but not loaded. The official systemctl documentation says `list-units` lists units systemd currently has in memory, and `--all` adds inactive/following loaded units. Updated the wording to say it includes loaded but inactive services.
- The `exited` service substate was described as normal for `Type=oneshot`. The systemd.service manual notes that oneshot services without `RemainAfterExit=yes` fall back to inactive/dead after completion. Updated the meaning to say the process exited while the unit remains active.
- `systemctl is-system-running` was described with an incomplete set of possible output states. Added `starting`, `offline`, and `unknown`, matching the systemctl manual.
- `systemd-analyze blame` output was described as services only. The systemd-analyze manual says it lists running units by initialization time, so the command comments and audit script heading now say units.
- The wrap-up said to use `list-units` for what is running right now. Since `list-units` reports loaded runtime units and can include active, failed, queued, or inactive units depending on options, this was changed to "loaded runtime units."

## Review Notes
The commands and flags used in the post are current and supported. The one-liner for "enabled but not currently running" compares enabled unit files against services in the `running` substate, so active services with `exited` substate can appear in that list; that behavior matches the command's wording but may deserve a caveat in a future expanded version.
