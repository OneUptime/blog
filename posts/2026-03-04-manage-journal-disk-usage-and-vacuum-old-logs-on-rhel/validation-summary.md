# Validation Summary: How to Manage Journal Disk Usage and Vacuum Old Logs on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd-journald
- journalctl
- journald.conf drop-in configuration
- systemd service and timer units

## Sources Consulted
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- systemd systemd-journald.service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-journald.service.html
- systemd systemd.timer manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd time syntax manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- Red Hat Enterprise Linux systemd journal persistent logging article: https://access.redhat.com/solutions/696893
- Local systemd man pages for journalctl(1), journald.conf(5), systemd.timer(5), and systemd.time(7)

## Issues Found
- The vacuum examples described `journalctl --vacuum-size=`, `--vacuum-time=`, and `--vacuum-files=` as operating on all journal data. Updated the comments to state that these options remove or limit archived journal files. This matches the journalctl documentation, which notes that vacuuming does not remove active journal files.
- The verification comment after `--vacuum-size=` implied that `journalctl --disk-usage` would always fall below the requested size. Updated it to mention that active journal files may still count toward total disk usage.

## Review Notes
The commands, journald drop-in paths, journald setting names, time-span values, and systemd timer syntax are valid for current systemd-based RHEL releases. On RHEL systems where persistent journald storage is not enabled, `/var/log/journal/` may not exist and journal files may be stored only under `/run/log/journal/`.
