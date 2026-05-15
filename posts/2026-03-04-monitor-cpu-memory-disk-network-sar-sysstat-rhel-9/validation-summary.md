# Validation Summary: How to Monitor CPU, Memory, Disk, and Network with sar (sysstat) on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- sysstat
- sar
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 Monitoring and managing system status and performance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- Red Hat Enterprise Linux 9 Managing systemd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Local `sar(1)` manual page
- Local `sadc(8)` manual page
- Local `sysstat(5)` manual page
- Local `sysstat.service`, `sysstat-collect.timer`, and `sysstat-summary.timer` unit files

## Issues Found
- The install command included PCP, SNMP, Prometheus-related assumptions, and Grafana-related assumptions even though the post is about monitoring with `sar` from sysstat. Changed the install step to install `sysstat` only.
- The service enablement step included PCP services (`pmcd` and `pmlogger`) that are not required for `sar`. Changed it to enable and start `sysstat`.
- The configuration section listed PCP, SNMP, Prometheus, and Grafana configuration paths that do not apply to a sysstat-only `sar` guide. Replaced them with `/etc/sysstat/sysstat` and `/etc/sysstat/sysstat.ioconf`.
- The restart example used a generic placeholder service. Replaced it with a `systemctl list-timers 'sysstat*'` verification command because sysstat collection is timer-driven and the config file is read by the scheduled collection scripts.
- The firewall section opened Prometheus, Node Exporter, Grafana, and SNMP ports even though local `sar` collection does not require network ports. Replaced the commands with a note that no firewall ports are needed for local `sar`.
- The verification section only showed CPU output through `sar -u` plus unrelated PCP and Prometheus checks. Replaced it with `sar` commands for CPU, memory, disk devices, and network interfaces.

## Review Notes
The corrected post now focuses on local sysstat/sar usage. Future improvements could add examples for historical reports with `sar -f` and explain which `SADC_OPTIONS` values are needed when collecting optional metrics for long-term retention.
