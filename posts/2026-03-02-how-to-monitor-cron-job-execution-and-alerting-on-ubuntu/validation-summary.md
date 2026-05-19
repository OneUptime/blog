# Validation Summary: How to Monitor Cron Job Execution and Alerting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu cron (vixie-cron / Ubuntu cron package)
- Bash scripting (flock, stat, mail)
- Postfix / mailutils for email notification
- Healthchecks.io (hosted dead man's switch)
- Prometheus node_exporter textfile collector
- logrotate
- systemctl / systemd service management

## Sources Consulted
- cron(8) manpage (Ubuntu cron package) — `-L loglevel` bitmask values
- /etc/default/cron file on Ubuntu (EXTRA_OPTS variable)
- flock(1) manpage for file descriptor locking syntax
- Healthchecks.io documentation (https://healthchecks.io/docs/) — `hc-ping.com` ping URL format
- Prometheus node_exporter textfile collector documentation
- GNU coreutils stat(1) manpage — `-c %Y` and `-c %y` format specifiers
- logrotate(8) manpage

## Issues Found

1. **Incorrect `-L` flag bitmask descriptions for cron.** The post originally claimed:
   - `-L 15` logs "scheduling, job start, job end"
   - `-L 1` logs "scheduling only"
   - `-L 2` logs "job execution"

   Per the cron(8) manpage, the bitmask values are: 1 = start of jobs, 2 = end of jobs, 4 = failed jobs, 8 = process number. `-L 15` (1+2+4+8) selects all of these. Rewrote the comments to match the manpage exactly.

2. **`cron-metrics.sh` referenced an undefined `START_EPOCH` variable** in the duration calculation `$(($(date +%s) - START_EPOCH))`. This would produce a syntax/arithmetic error when the script ran. Changed the script to accept duration as a third argument and updated the usage comment. Also changed `cat >>` to `cat >` so each invocation produces a clean tmp file before the atomic rename (the textfile collector pattern expects a fresh write).

3. **`check-heartbeats.sh` could recurse infinitely.** The original ended with:
   ```bash
   if [ $FAILED -ne 0 ]; then
       $0 2>&1 | mail ...
   fi
   ```
   Re-invoking `$0` re-runs the whole script; if the failure condition is still present (which it is, since nothing changed), the inner invocation also re-invokes `$0`, producing unbounded recursion. Replaced with a `REPORT` variable that captures the failure lines once and pipes that to `mail`.

## Review Notes

- `/etc/default/cron` is deprecated on the newest Ubuntu releases (the file itself now points users to `systemctl edit cron.service`), but `EXTRA_OPTS` is still honored on widely-used LTS versions (20.04, 22.04), so the instructions remain accurate for most readers.
- The cron-status awk extraction `awk '{print $3}'` against lines like `[2026-01-15 10:30:00] SUCCESS: nightly-backup ...` yields `SUCCESS:` or `FAILED:` with the trailing colon. Functional, but a reader replacing the value will see the colon — left as-is since it does not produce incorrect behavior.
- `/var/run` is a tmpfs on modern Ubuntu, so heartbeat files reset on reboot. That is acceptable for this use case (a heartbeat will simply re-appear on the next successful run), but worth knowing.
- The textfile collector path `/var/lib/prometheus/node-exporter` is one common location; the actual path depends on how node_exporter was installed and the `--collector.textfile.directory` flag. Left as-is since it is plausible and configurable.
- Healthchecks.io ping URL format (`https://hc-ping.com/<uuid>`) is correct as of the current Healthchecks.io API.
