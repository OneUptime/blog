# Validation Summary: How to Debug systemd Boot Issues on Ubuntu

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ubuntu
- systemd
- systemd-analyze
- journalctl
- systemctl
- GRUB kernel command line
- systemd journal persistence
- Graphviz dot

## Sources Consulted
- systemd-analyze official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html
- journalctl official manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemctl official manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd official manual, kernel command-line options: https://www.freedesktop.org/software/systemd/man/latest/systemd.html
- kernel-command-line official manual: https://www.freedesktop.org/software/systemd/man/latest/kernel-command-line.html
- systemd.special official manual, rescue and emergency targets: https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- systemd-debug-generator official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-debug-generator.html
- journald.conf official manual, Storage behavior: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- systemd.unit official manual, unit dependencies and masking behavior: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html

## Issues Found
- The command labeled "Show the 10 slowest units" used `head -20`. Changed it to `head -10` so the command matches the description.
- The comment above `journalctl -b -p err` said it showed failed units from the last boot. Changed the comment to say it shows error-level and worse messages from the current boot, which is what `journalctl` priority filtering does.
- The `journalctl --no-pager` example was described as adding timestamps. Changed the comment to describe its real effect: disabling the pager.
- The boot-debug snippet used `rd.systemd.log_level=debug`, which is not documented as a general system manager log-level kernel parameter. Replaced it with `debug` for enabling kernel debug output and kept `systemd.log_level=debug systemd.log_target=kmsg` for systemd debug logging.
- The permanent GRUB example appended only a comment to `/etc/default/grub`. Removed that ineffective command and clarified that the debug parameter should be added to the existing `GRUB_CMDLINE_LINUX_DEFAULT` value before running `update-grub`.
- The `critical-chain` explanation said `@` shows when a unit finished. Updated it to match the official wording: `@` shows when the unit became active or started, while `+` shows startup duration.
- The emergency-mode section stated that the root filesystem is read-only. Updated it to say the root filesystem may be read-only, because systemd's documentation notes this depends on how emergency mode was reached.
- The masked-units command used `systemctl list-units --state=masked`, which only lists units currently loaded in memory. Changed it to `systemctl list-unit-files --state=masked` to list masked unit files more reliably.
- The persistent journal setup created `/var/log/journal` but did not flush runtime logs to persistent storage. Added `sudo journalctl --flush`, matching journald documentation for switching from `/run/log/journal` to `/var/log/journal` after enabling persistence.

## Review Notes
Most commands and explanations were technically sound. `systemd-analyze blame` and `critical-chain` can still be misleading on parallel boot paths or for units that do not spend time in the `activating` state; the article already uses them appropriately as diagnostic starting points rather than absolute proof of all boot latency.
