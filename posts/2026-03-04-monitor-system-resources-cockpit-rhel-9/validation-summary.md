# Validation Summary: How to Monitor System Resource Usage from the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- Performance Co-Pilot (PCP)
- systemd services
- Linux resource-monitoring CLI tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console, installing and enabling Cockpit: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance, Metrics and history with `cockpit-pcp`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Cockpit project documentation: TCP port and socket activation: https://cockpit-project.org/guide/latest/listen
- Performance Co-Pilot documentation: scaling and local archive retention configuration: https://pcp.readthedocs.io/en/latest/HowTos/scaling/index.html
- Performance Co-Pilot documentation: archive logging and archive basename conventions: https://pcp.readthedocs.io/en/5.2.4/UAG/ArchiveLogging.html
- `pmval(1)` manual page: https://man7.org/linux/man-pages/man1/pmval.1.html
- Local command help for `mpstat`, `iostat`, `swapon`, and GNU `sort`

## Issues Found
- The PCP setup commands enabled `pmcd` and `pmlogger`, but Red Hat's RHEL 9 web-console metrics documentation specifies enabling `pmlogger.service` and `pmproxy.service` for the Cockpit Metrics and history integration. Updated the command to `sudo systemctl enable --now pmlogger.service pmproxy.service`.
- The historical `pmval -a` example used a compressed archive volume path ending in `.0.xz`. PCP tools expect an archive basename or archive directory for `-a`, not an individual data volume. Updated the example to use `/var/log/pcp/pmlogger/$(hostname)/20260304`.
- The retention configuration referenced `/etc/sysconfig/pmlogger` and used `PMLOGGER_DAILY_PARAMS="-E -x 30"`. PCP uses `/etc/sysconfig/pmlogger_timers` for this setting, and `-k` controls archive discard/retention while `-x` controls compression timing. Updated the example to `PMLOGGER_DAILY_PARAMS="-E -k 30"`.

## Review Notes
The remaining CLI examples are syntactically valid. Some tools such as `mpstat`, `iostat`, `iotop`, and `nload` may require packages that are not installed by default on every RHEL system, but their usage in the post is correct as command-line equivalents rather than prerequisites.
