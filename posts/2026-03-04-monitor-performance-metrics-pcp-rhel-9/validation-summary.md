# Validation Summary: How to Monitor Performance Metrics with PCP (Performance Co-Pilot) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Performance Co-Pilot (PCP)
- PCP command-line tools: pcp, pminfo, pmval, pmstat, pcp dstat, pmrep, pmlogger
- systemd services: pmcd, pmlogger, pmproxy, grafana-server, redis
- Grafana and grafana-pcp
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up PCP": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-pcp_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Logging performance data with pmlogger": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/logging-performance-data-with-pmlogger_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Setting up graphical representation of PCP metrics": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-up-graphical-representation-of-pcp-metrics_monitoring-and-managing-system-status-and-performance
- PCP upstream manual, PCPIntro: https://pcp.io/docs/pcpintro.html
- Linux man-pages, pminfo(1): https://man7.org/linux/man-pages/man1/pminfo.1.html
- Linux man-pages, pmval(1): https://man7.org/linux/man-pages/man1/pmval.1.html
- Linux man-pages, pmrep(1): https://www.man7.org/linux/man-pages/man1/pmrep.1.html
- Linux man-pages, pcp-dstat(1): https://man7.org/linux/man-pages/man1/pcp-dstat.1.html

## Issues Found
- The archive replay example assumed a fixed archive name of `$(date +%Y%m%d).0`. RHEL pmlogger archive basenames include time components, with `.0` as a data volume suffix. Changed the example to select the newest `.0` file and pass its archive basename to `pmval -a`.
- The custom pmlogger configuration example used `/etc/pcp/pmlogger/config.d/custom.config` and `log mandatory on 5sec`. Red Hat documents `/var/lib/pcp/config/pmlogger/config.default` for the primary logger configuration, and the documented syntax is `log mandatory on every 5 seconds`. Updated the command and syntax.
- The Grafana installation command used `pcp-webapp-grafana` and `pcp-pmda-redis`. RHEL 9 documentation uses `grafana` and `grafana-pcp` for the PCP plugin, with `redis` for the PCP Redis data source. Updated the package list.
- The Grafana service setup did not start Redis or open the Grafana firewall service. Updated the commands to enable Redis with pmproxy and open the Grafana service in firewalld.
- The remote host note only mentioned that `pmcd` must be running and port 44321 must be allowed. On RHEL, `pmcd` listens on localhost by default unless configured otherwise. Updated the note to say `pmcd` must listen on a reachable interface.

## Review Notes
The remaining PCP command examples and flags match the documented PCP tools. The post is a concise introductory guide; a future improvement could mention `pcp-zeroconf` for automated default PCP setup, but the manual package and service commands shown are still valid.
