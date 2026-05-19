# Validation Summary: How to Clean Up systemd Journal Logs on Ubuntu

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Ubuntu
- systemd-journald
- journalctl
- systemd unit and timer files
- Linux shell commands

## Sources Consulted
- systemd `journald.conf(5)` official manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd `journalctl(1)` official manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- systemd `systemd.exec(5)` official manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd `systemd.timer(5)` official manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd `systemd-analyze(1)` official manual: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- systemd `systemd.time(7)` official manual: https://www.freedesktop.org/software/systemd/man/systemd.time.html

## Issues Found
- The introduction stated that journald stores logs in `/var/log/journal/` by default. systemd's documented default for the default journal namespace is `Storage=auto`, which uses persistent storage only when `/var/log/journal/` exists and otherwise uses `/run/log/journal/`. Updated the wording to describe persistent storage and `Storage=auto` accurately.
- The command `ls -lah /var/log/journal/$(ls /var/log/journal/)/` only works reliably when `/var/log/journal/` contains a single simple directory name. Replaced it with a `find` command that lists journal files under the usual machine-id directories without relying on command substitution.
- The suggested verification command used `systemctl show systemd-journald | grep -E "Max|Keep|Retention"`, but these journald configuration keys are not exposed that way. Replaced it with `systemd-analyze cat-config systemd/journald.conf` filtered for the configured keys.
- The storage-mode check only grepped `/etc/systemd/journald.conf`, which misses drop-in files and may match commented defaults. Updated it to check active `Storage=` assignments in the main file and drop-ins.
- The volatile storage example set `SystemMaxUse=100M`, but `System*` limits apply to persistent `/var/log/journal` storage. Changed it to `RuntimeMaxUse=100M`, which applies to volatile `/run/log/journal` storage.
- The rate-limit example used `/dev/kmsg buffer overrun`, which indicates kernel message buffer loss rather than the usual per-service journald rate-limit suppression. Replaced it with a suppression-style message matching journald rate limiting behavior.

## Review Notes
The remaining `journalctl --vacuum-*`, journald configuration, per-service `LogRateLimit*`, and systemd timer examples are consistent with current systemd documentation. The text correctly notes that vacuum operations remove archived journal files, not active files; active files can keep `journalctl --disk-usage` above the requested vacuum target.
