# Validation Summary: How to Monitor System Performance with sysstat and sar on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- sysstat
- sar
- iostat
- mpstat
- pidstat
- cifsiostat
- systemd timers

## Sources Consulted
- Red Hat Customer Portal: How to use SAR to Monitor System Performance in Red Hat Enterprise Linux: https://access.redhat.com/solutions/276533
- sysstat upstream sar(1) manual via man7.org: https://man7.org/linux/man-pages/man1/sar.1.html
- sysstat upstream project documentation and source: https://sysstat.github.io/ and https://github.com/sysstat/sysstat
- CentOS Stream/RHEL sysstat RPM packaging: https://gitlab.com/redhat/centos-stream/rpms/sysstat
- systemd timer/calendar validation with `systemd-analyze calendar '*:0/5'` and systemd documentation references: https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- Local sysstat CLI help/man output for `sar`, `iostat`, `mpstat`, and `pidstat`.

## Issues Found
- The post said the sysstat service runs a cron job via systemd timer. Red Hat documents that RHEL 8 and 9 use systemd timers instead of cron for sysstat collection, so this was changed to say sysstat enables systemd timers that collect data every 10 minutes.
- The `sar -r` description said it shows swap usage. Swap space usage is reported by `sar -S`, while `sar -r` reports memory fields such as free, available, used, buffers, and cached memory. The description was corrected.
- The disk section used `sar -d -p` as the example for viewing specific device activity. The `-p` option is a pretty-output option; filtering specific block devices is done with `--dev=dev_list`. The example was changed to `sar -d --dev=sda`.

## Review Notes
The remaining commands and examples are consistent with sysstat/sar usage on RHEL 9. The default collection location `/var/log/sa/`, `saDD` binary files, `sarDD` text reports, `sysstat-collect.timer`, and `OnCalendar=*:0/5` override are consistent with Red Hat/sysstat behavior.
