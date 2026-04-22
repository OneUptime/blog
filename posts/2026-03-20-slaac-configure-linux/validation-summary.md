# Validation Summary: How to Configure SLAAC on Linux

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Linux IPv6 kernel sysctl settings
- IPv6 SLAAC and Router Advertisements
- NetworkManager and nmcli
- systemd-networkd `.network` files
- iproute2 IPv6 address and route inspection
- tcpdump and ndisc6/rdisc6 diagnostics
- Debian/Ubuntu `/etc/network/interfaces`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- systemd.network reference: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd.network source manual text: https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.network.xml
- Debian rdisc6(8) man page: https://manpages.debian.org/unstable/ndisc6/rdisc6.8.en.html

## Issues Found
- The sysctl and systemd-networkd examples used shell redirection to write under `/etc` without root privileges. Changed `cat > ...` to `sudo tee ... > /dev/null` so the commands work when run by a normal sudo-capable user.
- The NetworkManager example claimed `ipv6.ignore-auto-dns no` creates "SLAAC only" behavior and ignores the RA O flag. That property only controls whether automatically configured DNS is used, so the comment was corrected and `ipv6.method auto` was described as RA/SLAAC plus DHCPv6 according to RA flags.
- The systemd-networkd `[IPv6AcceptRA]` block used `UseRoutes=yes`, which is not the RA-client setting for default routes or SLAAC prefixes. Replaced it with valid RA-client settings: `UseAutonomousPrefix=yes`, `UseGateway=yes`, and `UseDNS=yes`.
- The systemd-networkd stable privacy note incorrectly used `IPv6PrivacyExtensions=kernel` for RFC 7217 stable privacy addressing. Replaced it with `Token=prefixstable`, which systemd documents as using the RFC 7217 algorithm.
- The RA refresh note listed `ip -6 route flush cache` as an alternative to sending a Router Solicitation. That does not solicit a fresh RA, so it was replaced with a note to wait for the next unsolicited RA.
- The troubleshooting note referred to `ip_forward=1`, which is the IPv4 forwarding sysctl name. Updated it to refer to IPv6 forwarding.

## Review Notes
No live network validation was performed because SLAAC behavior depends on the local router advertisements and interface state. The corrected commands and configuration keys were checked against kernel, NetworkManager, systemd-networkd, RFC, and diagnostic tool documentation.
