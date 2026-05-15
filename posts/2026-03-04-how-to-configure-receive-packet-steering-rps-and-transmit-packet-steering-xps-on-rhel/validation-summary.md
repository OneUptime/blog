# Validation Summary: How to Configure Receive Packet Steering (RPS) and XPS on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux networking stack
- Receive Packet Steering (RPS)
- Receive Flow Steering (RFS)
- Transmit Packet Steering (XPS)
- ethtool
- sysctl
- NetworkManager dispatcher scripts

## Sources Consulted
- Linux kernel documentation: Scaling in the Linux Networking Stack - https://docs.kernel.org/networking/scaling.html
- Red Hat Enterprise Linux 6 Performance Tuning Guide: Receive Packet Steering (RPS) - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/performance_tuning_guide/network-rps
- Red Hat Enterprise Linux 7 Performance Tuning Guide: Configuring RPS and RFS - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-networking-configuration_tools
- Red Hat Enterprise Linux 8 documentation: Avoiding TX queue lock contention with XPS - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/tuning-the-network-performance_monitoring-and-managing-system-status-and-performance
- ethtool(8) Linux manual page - https://man7.org/linux/man-pages/man8/ethtool.8.html

## Issues Found
- The flow table section described `rps_flow_cnt` and `net.core.rps_sock_flow_entries` as an RPS flow hash table. These settings are for Receive Flow Steering (RFS), which extends RPS. I renamed the section to "Configuring RFS Flow Table Size" and updated the comments to identify the settings as RFS.
- The RFS examples used `32768` for each receive queue. Red Hat and kernel documentation recommend setting each queue's `rps_flow_cnt` to `rps_sock_flow_entries / N` on multi-queue devices. I added a multi-queue example that calculates the per-queue value.
- The persistence example used a systemd service and did not persist `net.core.rps_sock_flow_entries` or XPS settings. Red Hat's RHEL documentation recommends applying XPS queue assignments from a NetworkManager dispatcher script when the interface is activated. I changed the persistence example to persist the sysctl in `/etc/sysctl.d/` and apply RPS, RFS, and XPS queue settings from a dispatcher script.

## Review Notes
The examples still use `ens192` and an `ff` CPU mask for an 8-core system, which is valid as an example but must be adjusted for the target interface name, CPU topology, NUMA locality, and queue count. Some NIC drivers automatically configure XPS, so manual XPS tuning should be checked against the NIC driver's behavior.
