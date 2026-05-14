# Validation Summary: How to Set Up SoftEther VPN Server on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- SoftEther VPN Server
- systemd
- firewalld
- SELinux

## Sources Consulted
- SoftEther VPN Project, "7.3 Install on Linux and Initial Configurations": https://www.softether.org/4-docs/1-manual/7._installing_softether_vpn_server/7.3_install_on_linux_and_initial_configurations
- SoftEther VPN Project, "3.3 VPN Server Administration": https://www.softether.org/4-docs/1-manual/3._SoftEther_VPN_Server_Manual/3.3_VPN_Server_Administration
- Red Hat Enterprise Linux 9, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld, "firewall-cmd" manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9, "Using SELinux": https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/using_selinux/
- Local command help for `systemctl` and `journalctl`

## Issues Found
- The post is a placeholder rather than a technically actionable SoftEther VPN Server setup guide. It uses generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>` instead of SoftEther-specific paths, service names, ports, or commands.
- The article omits the actual SoftEther installation workflow verified in the official SoftEther documentation, including preparing dependencies, building the `vpnserver` binary, placing it under `/usr/local/vpnserver`, creating a startup script or systemd unit, and managing the `vpnserver` service.
- The configuration guidance is inaccurate for SoftEther VPN Server. Official SoftEther documentation identifies `vpn_server.config` in the VPN Server executable directory and recommends administering settings through VPN Server Manager or `vpncmd`; the post instead points readers to a nonexistent generic `/etc/<service>/config.conf`.
- The firewall section does not identify SoftEther's default listener ports. Official SoftEther documentation states that the default listener ports are TCP 443, 992, and 5555.
- The SELinux troubleshooting command is incomplete for RHEL guidance. Red Hat documentation recommends querying AVC-related records with message types such as `AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR`, not only `avc`.
- The README was not edited because fixing the technical issues would require replacing the placeholder article with a substantially new tutorial, which is outside the requested scope of correcting individual technical inaccuracies.

## Review Notes
The `systemctl`, `journalctl`, and basic `firewall-cmd --permanent --add-port=<port>/tcp` patterns are generally valid Linux/RHEL command forms, but in this article they remain placeholders and do not create a working SoftEther VPN Server setup.
