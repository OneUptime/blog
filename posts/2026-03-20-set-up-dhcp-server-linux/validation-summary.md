# Validation Summary: How to Set Up a DHCP Server on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ISC DHCP Server (`dhcpd`)
- dnsmasq
- systemd service management
- NetworkManager `nmcli`
- ISC DHCP client (`dhclient`)
- Linux package management (`apt`, `yum`)

## Sources Consulted
- ISC DHCP `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhcpdconf
- ISC DHCP `dhcpd` manual: https://kb.isc.org/v1/docs/isc-dhcp-41-manual-pages-dhcpd
- ISC DHCP EOL dates: https://kb.isc.org/docs/isc-dhcp-eol-dates
- dnsmasq man page: https://dnsmasq.org/docs/dnsmasq-man.html
- Red Hat Enterprise Linux 8 DHCP services documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Ubuntu `isc-dhcp-server` documentation: https://help.ubuntu.com/community/isc-dhcp-server
- systemd `systemctl` manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- RFC 6762, Multicast DNS: https://datatracker.ietf.org/doc/html/rfc6762
- Local command validation: `dnsmasq --help dhcp` and `dnsmasq --test` with dnsmasq 2.90

## Issues Found
- The sample used `example.local` as the DHCP domain name. Because `.local` has special mDNS semantics in RFC 6762, changed it to the documentation-safe `example.com`.
- ISC DHCP was presented without a current maintenance caveat. Added a note that ISC DHCP is no longer maintained upstream and that new deployments should consider Kea or another maintained DHCP server.
- The ISC service commands were Debian/Ubuntu-specific even though the installation section also covered RHEL/CentOS. Added RHEL/CentOS `dhcpd` service commands and clarified that `/etc/default/isc-dhcp-server` applies to Debian/Ubuntu.
- The active lease file path for ISC dhcpd only covered Debian/Ubuntu. Added the RHEL/CentOS path `/var/lib/dhcpd/dhcpd.leases`.
- The dnsmasq DHCP option used `option:subnet-mask`, which dnsmasq rejects. Changed it to `option:netmask`, verified with `dnsmasq --test`.
- The key takeaway named ISC-style option identifiers as if they applied generically to both tools. Reworded it to describe the required DHCP settings generically.

## Review Notes
`dhcpd` was not installed locally, so ISC syntax was checked against ISC and Red Hat documentation rather than executed locally. The corrected dnsmasq snippet was syntax-checked locally with `dnsmasq --test`. The examples still use placeholder addresses, MACs, and public DNS resolvers; production setups should replace them and ensure the serving interface has a static address in the served subnet.
