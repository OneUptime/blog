# Validation Summary: How to Check the Status and Logs of a systemd Service on RHEL

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd
- systemctl
- journalctl
- systemd-journald
- journald.conf

## Sources Consulted
- systemctl official manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl official manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd.time official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- journald.conf official manual: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- Red Hat Enterprise Linux 9 documentation, Configuring basic system settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/
- Local systemd man pages for systemctl, journalctl, systemd.time, and journald.conf

## Issues Found
- The quick status examples described `systemctl is-active`, `systemctl is-enabled`, and `systemctl is-failed` as returning only a small set of states. The systemctl manual documents broader active states and unit file states, so the comments were updated to describe representative states rather than exhaustive two-value outputs.
- The failed-services example used `systemctl --failed` while describing services specifically. The systemctl manual documents `--failed` as listing failed units, so the command was changed to `systemctl --failed --type=service` and the explanation now refers to failed service units.
- The journal vacuum examples said they kept only a given time span or size of logs. The journalctl manual documents vacuuming as operating on archived journal files, with active files not removed by those options, so the comments were updated to say "Vacuum archived journal files".

## Review Notes
The remaining commands and options were verified as current for systemd: `systemctl status`, `is-active`, `is-enabled`, `is-failed`, `--failed`, `journalctl -u`, `-f`, `-n`, `-b`, `--since`, `--until`, `-p`, `-o`, `--no-pager`, `--disk-usage`, `--vacuum-time`, and `--vacuum-size`. The `SystemMaxUse` and `MaxRetentionSec` keys are valid `journald.conf` settings. The post is generally applicable to RHEL 9 because RHEL 9 uses systemd and exposes these standard tools, though exact output fields can vary by unit type, service implementation, and systemd version.
