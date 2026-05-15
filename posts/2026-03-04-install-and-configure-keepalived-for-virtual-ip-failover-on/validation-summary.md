# Validation Summary: How to Install and Configure Keepalived for Virtual IP Failover on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Keepalived
- VRRP virtual IP failover
- systemd
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux Load Balancer Administration: Install and Configure keepalived - https://docs.redhat.com/documentation/kn-in/red_hat_enterprise_linux/7/html/load_balancer_administration/keepalived_install_example1
- Keepalived configuration manual page - https://www.mankier.com/5/keepalived.conf
- Keepalived daemon manual page - https://www.mankier.com/8/keepalived

## Issues Found
- The install command used `<package-name>` as a placeholder, which would not install Keepalived. Changed it to `sudo dnf install -y keepalived`, matching RHEL DNF package installation syntax.
- The configuration path used `/etc/<service>/config.conf`, which is not the Keepalived configuration path. Changed it to `/etc/keepalived/keepalived.conf`.
- The service management commands used `<service-name>`, which would not work as written. Changed them to use the `keepalived` systemd service.
- The configuration guidance was generic and did not configure virtual IP failover. Added a minimal `vrrp_instance` example with `interface`, `virtual_router_id`, `priority`, `authentication`, and `virtual_ipaddress`, consistent with Keepalived configuration syntax.
- The verification and troubleshooting commands used placeholders. Changed them to check `keepalived` status, logs, package installation, and the configured interface address.

## Review Notes
The example uses `eth0` and `192.168.0.100/24` as sample values that must be replaced for a real environment. For production deployments, firewall rules for VRRP protocol traffic and health-check scripts may also be needed, depending on the host firewall and service being protected.
