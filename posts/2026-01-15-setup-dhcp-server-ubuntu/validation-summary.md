# Validation Summary: How to Set Up a DHCP Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- ISC DHCP Server (`isc-dhcp-server`, `dhcpd`)
- ISC DHCP Relay (`isc-dhcp-relay`, `dhcrelay`)
- Netplan
- UFW
- systemd
- rsyslog
- DHCPv4, DHCP options, leases, reservations, relay, PXE boot, VLANs, and failover

## Sources Consulted
- Ubuntu Server documentation: How to install and configure `isc-dhcp-server` - https://ubuntu.com/server/docs/how-to/networking/install-isc-dhcp-server/
- Ubuntu Server documentation: How to install and configure `isc-kea` - https://ubuntu.com/server/docs/how-to/networking/install-isc-kea/
- ISC DHCP 4.4 manual page for `dhcpd.conf` - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 manual page for `dhcpd` - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.4 manual page for DHCP options - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- Ubuntu manpage for `dhcp-lease-list` - https://manpages.ubuntu.com/manpages/focal/man8/dhcp-lease-list.8.html
- Ubuntu manpage for `dhcpd.leases` - https://manpages.ubuntu.com/manpages/jammy/man5/dhcpd.leases.5.html
- Ubuntu manpage for `dhcrelay` - https://manpages.ubuntu.com/manpages/jammy/man8/dhcrelay.8.html
- Netplan examples documentation - https://netplan.readthedocs.io/en/0.106/examples/
- RFC 2131: Dynamic Host Configuration Protocol - https://datatracker.ietf.org/doc/html/rfc2131
- IANA Service Name and Transport Protocol Port Number Registry - https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml

## Issues Found
1. The prerequisites said "Ubuntu 20.04 or later." Ubuntu's current server documentation warns that `isc-dhcp-server` is deprecated and unsupported starting with Ubuntu 24.04 LTS, and recommends Kea or dnsmasq instead. I changed the prerequisite to Ubuntu 20.04 or 22.04 for supported ISC DHCP packages and noted that Ubuntu 24.04 and later should use Kea or dnsmasq.
2. The UFW example allowed inbound UDP 68. RFC 2131 defines UDP 67 as the DHCP server port and UDP 68 as the DHCP client port, so opening inbound UDP 68 on the server is misleading. I changed it to allow outbound UDP 68 only for environments with restrictive outbound firewall policy.

## Review Notes
- The ISC DHCP configuration examples use valid `dhcpd.conf` constructs for subnet declarations, ranges, host reservations, pools, PXE directives, failover peers, and standard DHCP options.
- The workspace does not have `dhcpd` or ISC DHCP man pages installed locally, so validation was documentation-based rather than a live `dhcpd -t` parser run.
- ISC DHCP is legacy software. The post is still useful for Ubuntu 20.04 and 22.04 systems, but new Ubuntu deployments should generally prefer Kea or dnsmasq.
