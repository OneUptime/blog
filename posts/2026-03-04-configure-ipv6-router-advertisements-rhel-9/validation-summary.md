# Validation Summary: How to Configure IPv6 Router Advertisements on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- IPv6 Neighbor Discovery
- Router Advertisements and Router Solicitations
- SLAAC
- radvd and radvdump
- NetworkManager / nmcli
- Linux IPv6 sysctl settings
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring the radvd service for IPv6 routers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- radvd official repository and man pages: https://github.com/radvd-project/radvd
- radvd.conf official man page source: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.5.man
- radvd official man page source: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.8.man
- radvdump official man page source: https://raw.githubusercontent.com/radvd-project/radvd/master/radvdump.8.man
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- NetworkManager nm-settings-nmcli documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post said routers periodically "broadcast" RAs. IPv6 does not use broadcast; unsolicited RAs are multicast. Changed "broadcast" to "multicast".
- The sequence diagram showed SLAAC producing an EUI-64 address and sent Duplicate Address Detection to the router. SLAAC interface identifiers are not necessarily EUI-64, and DAD uses Neighbor Solicitation to the solicited-node multicast address. Updated the example address text and diagram participant.
- The verification command `ss -ulnp | grep radvd` implied that radvd listens on UDP. radvd handles ICMPv6 Router Solicitations and sends Router Advertisements, not UDP traffic. Replaced it with `pgrep -a radvd`.
- The firewall troubleshooting command used `--add-icmp-block-inversion`, which does not simply allow ICMPv6 RAs and can invert ICMP block behavior. Replaced it with commands to query and remove blocks for `router-advertisement` and `router-solicitation`.

## Review Notes
The main radvd configuration syntax, RDNSS/DNSSL usage, forwarding sysctl, systemd commands, nmcli static IPv6 configuration, and DHCPv6 RA flags are consistent with the consulted documentation. The local review environment did not have `radvd` or `firewall-cmd` installed, so those command checks were verified against upstream and vendor documentation rather than local binaries.
