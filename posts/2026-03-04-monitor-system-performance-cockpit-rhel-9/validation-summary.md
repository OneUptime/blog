# Validation Summary: How to Monitor System Performance Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- Performance Co-Pilot (PCP)
- PMIE
- Linux performance commands: top, mpstat, iostat, iotop, ip, ss, free, ps, pmrep, pminfo
- systemd services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Monitoring performance on the local system by using the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/using-the-web-console-for-selecting-performance-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Setting up PCP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-pcp_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Logging performance data with pmlogger: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Performance Co-Pilot documentation: Performance Metrics Inference Engine: https://pcp.readthedocs.io/en/stable/UAG/PerformanceMetricsInferenceEngine.html
- Performance Co-Pilot quick guide: Setup automated rules to write to the system log: https://pcp.readthedocs.io/en/latest/QG/SetupAutomatedRules.html
- Linux man page: pmrep(1): https://man7.org/linux/man-pages/man1/pmrep.1.html
- Local man pages and command help for iostat, mpstat, top, ip, and ss.

## Issues Found
- The PCP setup commands enabled `pmcd` and `pmlogger`, but the RHEL 9 web console metrics prerequisites require `pmlogger.service` and `pmproxy.service` for Cockpit metrics history. Updated the command to enable `pmlogger.service pmproxy.service` and updated the status check to include `pmproxy`.
- The post said `pmlogger` writes data to `/var/log/pcp/` by default. RHEL documentation and PCP behavior place local archives under `/var/log/pcp/pmlogger/<hostname>/`. Updated the path accordingly.
- The retention section implied that archive retention is adjusted directly in `/etc/pcp/pmlogger/control.d/local` and described `-c`/`-t` as retention options. RHEL documentation identifies `pmlogger_daily` as the component that rotates and culls archives, with a default two-week limit. Replaced the misleading edit instruction with a command to consult `pmlogger_daily` options.
- The PMIE rule example wrote a rule into `/etc/pcp/pmie/config.d/cpu-alert.pmie`, but the documented default PMIE configuration file on RHEL is `/var/lib/pcp/config/pmie/config.default`. Updated the example to append to that file.
- The PMIE example comment claimed the rule triggered after five minutes, but the rule did not encode a five-minute duration. Updated the comment to match the actual threshold behavior.

## Review Notes
The remaining command examples are syntactically valid for the documented tools, though several helper utilities such as `mpstat`, `iostat`, `iotop`, and `nload` may require additional packages on minimal RHEL installations. The post is still accurate as a first-response monitoring workflow rather than a complete PCP tuning reference.
