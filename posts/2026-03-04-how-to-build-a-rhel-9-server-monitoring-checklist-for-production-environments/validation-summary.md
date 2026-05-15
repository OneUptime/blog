# Validation Summary: How to Build a RHEL 9 Server Monitoring Checklist for Production Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux system monitoring commands
- sysstat tools: mpstat, sar, iostat
- iproute2 tools: ss, ip
- systemd service units
- Prometheus Node Exporter
- rsyslog and Linux log files

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Red Hat Enterprise Linux 9 documentation, "Security hardening" logging and rsyslog sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Prometheus documentation, "Monitoring Linux host metrics with the Node Exporter": https://prometheus.io/docs/guides/node-exporter/
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.unit manual: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Local command help output for useradd, systemctl, ip, and ss.

## Issues Found
- The network command used `ip -s link show eth0`, which assumes the interface is named `eth0`. RHEL 9 systems often use predictable interface names, so the example was changed to `ip -s link show <interface>`.
- The Node Exporter installation example used version `1.7.0`, while the current Prometheus guide uses `1.10.2`. The download URL, archive name, and extracted directory were updated to `1.10.2`.
- The systemd unit creation flow enabled the service immediately after writing the unit file. Added `sudo systemctl daemon-reload` before `sudo systemctl enable --now node_exporter` so systemd reloads the newly created unit file before enabling and starting it.

## Review Notes
- The listed monitoring commands are syntactically valid. On RHEL 9, `sar`, `mpstat`, and `iostat` are provided by the sysstat package, so the package must be installed for those examples to run.
- The `/var/log/messages` and `/var/log/secure` paths are appropriate for standard RHEL rsyslog-based logging, but environments that centralize logs or rely primarily on journald may need additional checks.
