# Validation Summary: How to Install and Use Performance Co-Pilot (PCP) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Performance Co-Pilot (PCP)
- PCP services: pmcd and pmlogger
- PCP command-line tools: pminfo, pmval, pmstat, pmrep, pmdumplog, and pcp-atop
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up PCP": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-pcp_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Logging performance data with pmlogger": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Configuration options for PCP scaling": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-pcp_monitoring-and-managing-system-status-and-performance
- pcp-atop(1) Linux manual page: https://man7.org/linux/man-pages/man1/pcp-atop.1.html
- pmlogger_daily(1) Linux manual page: https://man7.org/linux/man-pages/man1/pmlogger_daily.1.html
- pmrep(1) Linux manual page: https://man7.org/linux/man-pages/man1/pmrep.1.html
- pmstat(1) Linux manual page: https://man7.org/linux/man-pages/man1/pmstat.1.html
- Upstream PCP metric namespace and packaged configuration files from PCP 6.2.0 package metadata, used to verify metric names such as `disk.all.read_bytes`, `network.interface.in.bytes`, `mem.util.used`, and `kernel.percpu.cpu.user`.

## Issues Found
- The archive retention example described `/etc/pcp/pmlogger/control.d/local` as the retention file and pointed readers to `/etc/sysconfig/pmlogger`. On RHEL 9 documentation, `control.d/local` is the local logger control file, while pmlogger daily timer parameters are configured in `/etc/sysconfig/pmlogger_timers`; Red Hat's example includes `PMLOGGER_DAILY_PARAMS="-E -k X"`. Updated the comments, path, and example value.
- The `pcp-atop` archive replay example used `pcp -a ... atop`. The `pcp-atop(1)` synopsis documents archive playback with `pcp atop -r folio`. Updated the command to use `pcp atop -r /var/log/pcp/pmlogger/$(hostname)/20250115`.

## Review Notes
The remaining commands and metric names are consistent with Red Hat PCP documentation, upstream PCP man pages, and PCP packaged metric configuration. Archive file basenames in examples are placeholders; users should replace `20250115` with an actual archive basename present under their host directory.
