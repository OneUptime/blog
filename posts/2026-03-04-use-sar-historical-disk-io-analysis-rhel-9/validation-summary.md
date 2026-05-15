# Validation Summary: How to Use sar for Historical Disk I/O Analysis on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- sysstat
- sar
- sadf
- systemd timers
- Linux block device I/O metrics

## Sources Consulted
- Red Hat Customer Portal: How to use SAR to Monitor System Performance in Red Hat Enterprise Linux - https://access.redhat.com/solutions/276533
- Red Hat Enterprise Linux 9 documentation: Overview of performance monitoring options - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- sar(1) Linux manual page - https://man7.org/linux/man-pages/man1/sar.1.html
- sadf(1) Linux manual page - https://man7.org/linux/man-pages/man1/sadf.1.html
- sysstat(5) Linux manual page - https://man7.org/linux/man-pages/man5/sysstat.5.html
- Local systemd.time(7) manual page for OnCalendar syntax validation
- Local sysstat systemd unit files for sysstat.service, sysstat-collect.timer, and sysstat-summary.timer behavior

## Issues Found
- The post said sysstat uses a cron job or systemd timer on RHEL. For RHEL 9, Red Hat documents systemd timers rather than cron for sysstat collection. Changed the sentence to specify that RHEL 9 uses systemd timers.
- The sample `sar -d` output and `DEV` description implied current sysstat reports block devices as major-minor names such as `dev8-0` by default. Current `sar(1)` says `sar -d` resolves names from `/sys` and displays names as they should appear in `/dev` when possible. Updated the sample output and `DEV` description.
- The `-p` explanation said it changes `dev8-0` into names such as `sda`. Current `sar(1)` describes `-p` as `--pretty`, which makes reports easier for humans to read. Updated the explanation to avoid overstating the flag's behavior.
- The `sar -b` field list omitted current discard-related fields. Added `bdscd/s` and `dtps` to match current sysstat output.
- The trend-analysis wording said the command found the busiest disk I/O periods, but the command sorts by `wkB/s`. Changed the wording to say it finds periods with the highest write throughput. Also removed `-p` from that sorting example because `sar -dp` moves the `DEV` column to the end of the output, which changes the numeric field positions.

## Review Notes
The commands and configuration snippets are otherwise valid for current RHEL 9/sysstat behavior. The `%iowait` guidance is a useful heuristic, but future revisions could add more nuance that high I/O wait should be correlated with per-device latency, queue depth, and application symptoms before declaring a storage bottleneck.
