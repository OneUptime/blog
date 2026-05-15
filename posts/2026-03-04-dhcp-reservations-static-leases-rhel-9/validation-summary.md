# Validation Summary: How to Set Up DHCP Reservations and Static Leases on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ISC DHCP / dhcpd
- DHCP host declarations and fixed addresses
- Linux networking commands
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Providing DHCP services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Red Hat Enterprise Linux 9.7 Release Notes, deprecated functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/deprecated-functionalities
- ISC DHCP 4.4 dhcpd.conf manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 dhcpd manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.4 dhclient manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- Local iproute2 help output for `ip neigh show`

## Issues Found
- Added a RHEL 9 caveat that ISC DHCP client and server packages are deprecated but still supported during the RHEL 9 lifecycle. Red Hat documents that these packages will not be distributed in later major RHEL releases and recommends planning for alternatives such as ISC Kea.
- Corrected the description of reservations inside the dynamic DHCP range. ISC DHCP `fixed-address` host declarations should not be treated as automatically removing an address from the dynamic pool for other clients.
- Replaced the misleading "No free leases" troubleshooting note with an IP conflict warning. A fixed-address host declaration does not need a free dynamic lease from the pool, but placing that address inside the dynamic range can cause another client to receive it as a normal dynamic lease.

## Review Notes
The remaining `dhcpd.conf` examples use valid ISC DHCP syntax for IPv4 host declarations, per-host options, groups, lease times, `next-server`, and `filename`. The validation command `dhcpd -t -cf /etc/dhcp/dhcpd.conf`, service restart with `systemctl restart dhcpd`, `dhclient -r eth0 && dhclient eth0`, and `ip neigh show` are consistent with the relevant command documentation. The local container did not have `dhcpd` or `dhclient` installed, so command behavior was checked against ISC manual pages rather than by executing those binaries locally.
