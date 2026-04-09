# Validation Summary: How to Fix MON_CLOCK_SKEW Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (MON_CLOCK_SKEW health check, mon_clock_drift_allowed config)
- Rook (Ceph operator for Kubernetes)
- chrony / chronyd (NTP client)
- timedatectl (systemd time management)
- Prometheus (alerting rules with node_exporter metrics)
- Kubernetes (node-level time synchronization)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Troubleshooting Monitors documentation: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-mon/
- Ceph Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Red Hat Ceph Storage 6 Troubleshooting Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/troubleshooting_guide/troubleshooting-ceph-monitors
- chrony documentation (chronyc tracking output fields)

## Issues Found
- **Incorrect chronyc field name (line 41):** The post referenced `System clock offset` as the field to look for in `chronyc tracking` output. The actual field name is `System time` (e.g., `System time : 0.000000123 seconds fast of NTP time`). Fixed by changing to `System time` and clarifying which field belongs to which tool.

## Review Notes
- The `ceph time-sync-status` command is valid and documented for Ceph Luminous (12.x) and later releases.
- The default `mon_clock_drift_allowed` value of 0.05 seconds and the `ceph config set` syntax are both correct per official documentation.
- The claim about Paxos consensus failures is a slightly stronger characterization than the official docs ("serious effect on monitor operation"), but is a reasonable and substantively accurate description of the risk.
- The chrony service name varies by distro: it is `chrony` on Debian/Ubuntu and `chronyd` on RHEL/CentOS. The post uses `chronyd`, which works on RHEL but may need adjustment for Debian/Ubuntu users.
- The chrony config file path is `/etc/chrony/chrony.conf` on Debian/Ubuntu but `/etc/chrony.conf` on RHEL/CentOS. The post only shows the Debian path.
- The Prometheus alert rule uses `node_timex_offset_seconds`, which is a valid node_exporter metric. The alert syntax is correct.
