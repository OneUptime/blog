# Validation Summary: How to Use top, htop, vmstat, and iostat for System Diagnostics on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- procps-ng
- top
- htop
- vmstat
- sysstat
- iostat
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9 package manifest for `procps-ng`: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf
- sysstat upstream documentation and README: https://github.com/sysstat/sysstat
- procps-ng `top(1)` manual page: https://www.man7.org/linux/man-pages/man1/top.1%40%40procps-ng.html
- htop official downloads documentation: https://htop.dev/downloads.html
- Fedora EPEL 9 htop package page: https://packages.fedoraproject.org/pkgs/htop/htop/epel-9.html

## Issues Found
- The package installation command installed PCP and SNMP packages but did not directly match the article title. Updated it to install `procps-ng` and `sysstat`, which provide `top`, `vmstat`, and `iostat` on RHEL 9, and noted that `htop` requires EPEL to be enabled on RHEL-compatible systems.
- The service section implied `pmcd` and `pmlogger` were required. Updated it to state that `top`, `htop`, `vmstat`, and `iostat` read live data without a daemon, while `sysstat` is only needed as a service for historical `sar` data collection.
- The configuration section listed PCP, SNMP, Prometheus, and Grafana configuration paths that were unrelated to the tools in the title. Replaced them with direct command examples for the four diagnostic tools.
- The firewall section opened Prometheus, Node Exporter, Grafana, and SNMP ports even though local diagnostics with these tools need no open ports. Updated it to say no firewall ports are required unless a separate remote monitoring stack is added.
- The verification section used PCP, `sar`, and Prometheus checks rather than checking `top`, `htop`, `vmstat`, and `iostat`. Updated it with commands that verify the relevant tools run.
- The alerting section implied alerting was part of these local tools. Clarified that alerting requires a separate monitoring stack or Red Hat Insights.

## Review Notes
The post is now technically aligned with the title. A future improvement would be to add interpretation guidance for common fields such as load average, `%wa`, run queue length, swap-in/swap-out, and `iostat` latency metrics.
