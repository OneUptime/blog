# Validation Summary: How to Configure NAT Masquerading with Firewalld on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld zones, policies, masquerading, and forward ports
- Linux IPv4 forwarding and sysctl
- NetworkManager nmcli
- ISC DHCP server on RHEL
- dnsmasq
- conntrack-tools
- tcpdump

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters, using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation: Managing networking infrastructure services, providing DHCP services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Red Hat Enterprise Linux 9 documentation: Configuring and managing networking, nmcli IPv4 gateway and DNS examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld policies manual page: https://firewalld.org/documentation/man-pages/firewalld.policies.html
- firewalld concepts documentation: https://firewalld.org/documentation/concepts.html
- firewalld direct interface manual page: https://firewalld.org/documentation/man-pages/firewalld.direct.html
- firewalld Gateway policy set documentation: https://firewalld.org/documentation/man-pages/firewalld.policy-set-gateway.html
- conntrack-tools user manual: https://conntrack-tools.netfilter.org/manual.html

## Issues Found
- The original gateway setup enabled masquerading but did not explicitly allow routed traffic from the internal zone to the external zone. Current firewalld documentation states that inter-zone traffic is denied by default and should be controlled with policy objects. Added an `internal-to-external` policy with `internal` as ingress, `external` as egress, and `ACCEPT` as the target.
- The outbound restriction example used `firewall-cmd --direct` rules. The firewalld direct interface is deprecated and superseded by policies. Replaced the direct rules with policy-based filtering on the `internal-to-external` policy, using a `REJECT` target and allowing only the `http`, `https`, and `dns` services.
- Clarified that services added to the internal zone allow services hosted on the gateway, while forwarding between zones is handled by the policy.

## Review Notes
The remaining commands and configuration examples are technically plausible for RHEL 9, assuming interface names, NetworkManager connection names, and package availability match the reader's environment. The examples are IPv4-focused; IPv6 forwarding, IPv6 masquerading, and DHCPv6 require different handling.
