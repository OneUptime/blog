# Validation Summary: How to Set Up Dual-Stack IPv4/IPv6 Networking on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager and nmcli
- IPv4 and IPv6 dual-stack configuration
- SLAAC and DHCP/DHCPv6
- RFC 6724 address selection
- glibc /etc/gai.conf address selection policy
- firewalld
- iproute2, ping, dig, curl, tcpdump, and ss

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring an Ethernet connection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-an-ethernet-connection_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Managing the default gateway setting": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/managing-the-default-gateway-setting_configuring-and-managing-networking
- NetworkManager nm-settings-nmcli reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- RFC 6724, Default Address Selection for IPv6: https://www.rfc-editor.org/rfc/rfc6724
- RFC 8305, Happy Eyeballs Version 2: https://www.rfc-editor.org/rfc/rfc8305
- Local Linux command help/man pages for ping, ss, ip addrlabel, tcpdump, dig, curl, and gai.conf.

## Issues Found
- The post described `ip -6 addrlabel show` as showing the current address selection policy table. That command shows the IPv6 address label table used by Linux, not the complete RFC 6724 destination precedence policy table. Updated the wording and command comment to say "IPv6 address label table."
- The Happy Eyeballs explanation said applications try IPv6 and IPv4 connections "simultaneously." RFC 8305 describes staggered connection attempts that may run in parallel after a delay. Updated the wording to "in a staggered sequence."

## Review Notes
The nmcli examples match RHEL 9 and NetworkManager documentation for static IPv4/IPv6, DHCPv4, SLAAC/DHCPv6 auto configuration, gateways, DNS properties, and connection activation. The firewalld, verification, routing, curl, ping, tcpdump, and ss commands are valid. The examples assume the NetworkManager connection profile is named `ens192`; on systems where the profile name differs from the interface name, readers should use the connection name shown by `nmcli connection show`.
