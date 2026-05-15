# Validation Summary: How to Configure DHCPv6 for IPv6 Address Assignment on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ISC DHCP Server / DHCPv6
- IPv6 SLAAC
- Router Advertisements and radvd
- NetworkManager / nmcli
- firewalld
- tcpdump and journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing networking infrastructure services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_networking_infrastructure_services/red_hat_enterprise_linux-9-managing_networking_infrastructure_services-en-us.pdf
- Red Hat Enterprise Linux 9: Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Red Hat Enterprise Linux 9: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/red_hat_enterprise_linux-9-configuring_firewalls_and_packet_filters-en-us.pdf
- ISC DHCP 4.4 dhcpd.conf manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 dhcp-options manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- radvd.conf(5) manual page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6: https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861.html
- Local NetworkManager 1.46.0 nm-settings-nmcli manual output

## Issues Found
- The post referred to the `dhcp6.sntp-servers` DHCPv6 option as an NTP option. ISC documents this option as the SNTP servers option, so the diagram and comments were updated from NTP to SNTP where they described that specific option.
- The post called `dhcpd6` the daemon. On RHEL, `dhcpd6` is the systemd service name for DHCPv6 and runs `dhcpd` in IPv6 mode with `/etc/dhcp/dhcpd6.conf`, so the wording was corrected.
- The RHEL client troubleshooting example used `ipv6.method dhcp`. NetworkManager documents `ipv6.method auto` as the mode that uses Router Advertisements and requests DHCPv6 when the managed flag is advertised. The command was changed to `ipv6.method auto` to avoid losing RA-provided routing behavior.

## Review Notes
The remaining DHCPv6 server configuration syntax, `range6`, `fixed-address6`, `host-identifier option dhcp6.client-id`, radvd flags, firewalld service name, DHCPv6 ports, lease file path, and validation command were consistent with the consulted documentation. ISC DHCP is marked EOL by ISC, but it remains the RHEL `dhcp-server` implementation documented for RHEL 9.
