# Validation Summary: How to Configure a DHCP Failover Pair for High Availability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- ISC DHCP server / `dhcpd`
- DHCP failover
- firewalld
- systemd
- chrony

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Providing DHCP services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC Knowledge Base, "A Basic Guide to Configuring DHCP Failover": https://kb.isc.org/docs/aa-00502
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post said a surviving ISC DHCP failover peer takes over automatically after MCLT. ISC DHCP continues serving its own available leases after communication is interrupted, but full-pool takeover requires partner-down state; automatic transition only happens if `auto-partner-down` is configured, and ISC documents split-brain risks for that setting. Updated the introduction, failover explanation, key parameter table, and testing steps to describe partner-down and `auto-partner-down` accurately.
- The primary configuration comment described `mclt` as the wait before full control, and the parameter table described `max-response-delay` as declaring the peer down. Updated both descriptions to match ISC's definitions.

## Review Notes
- The primary and secondary failover peer examples match ISC's documented `mclt`, `split`, `max-response-delay`, `max-unacked-updates`, and `load balance max seconds` syntax.
- Red Hat Enterprise Linux 9 documents the `dhcp-server` package, `/etc/dhcp/dhcpd.conf`, and `dhcpd` systemd service for DHCPv4.
- The firewall, systemd, and chrony commands shown are plausible for RHEL systems, but real deployments should also ensure DHCP relays forward requests to both failover peers when clients are not on directly connected subnets.
