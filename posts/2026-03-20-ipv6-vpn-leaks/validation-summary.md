# Validation Summary: How to Troubleshoot IPv6 VPN Leaks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- VPNs
- OpenVPN
- WireGuard
- Linux networking
- iproute2
- ip6tables
- DNS
- tcpdump
- sysctl

## Sources Consulted
- OpenVPN 2.6 Manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- WireGuard project documentation: https://www.wireguard.com/
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- OpenDNS diagnostic documentation: https://support.opendns.com/hc/en-us/articles/227988487-Diagnostic-Tool-Link-and-Instructions
- OpenDNS DoH documentation with IPv6 resolver addresses: https://support.opendns.com/hc/en-us/articles/360038086532-Using-DNS-over-HTTPS-DoH-with-OpenDNS
- Local command help/output reviewed: `openvpn --help`, `ip -6 route help`, `ip6tables --help`, `curl --help all`, `dig -h`, `tcpdump -h`, `sysctl --help`

## Issues Found
- The introduction overstated the cause of IPv6 leaks by implying most VPN clients were designed for IPv4. This was corrected to the more precise condition that leaks occur when the VPN client or server is only configured for IPv4.
- The leak-check section described the second `curl -6` call as a DNS leak test even though it is just another IPv6 echo service. The wording was corrected so the command matches what it actually does.
- The `ip -6 route show default` example showed `::/0` output, but this command reports the default route as `default ...`. The example and explanation were corrected accordingly.
- The route-diagnosis explanation implied that a global IPv6 address on `eth0` alone causes a leak. This was corrected to focus on the IPv6 default route and missing VPN-side IPv6 route, which is the relevant condition.
- The `ip6tables` example did not match its own comment, because `! -o lo -j DROP` would drop everything except loopback rather than "except to VPN interface". It was replaced with top-of-chain rules that allow `lo` and the VPN interface and then drop other outbound IPv6 traffic.
- The `ip6tables -F OUTPUT` cleanup command would flush unrelated firewall rules. It was replaced with matching `-D` commands so only the added rules are removed.
- The OpenVPN snippet mixed server-side and client-side directives by placing `push` inside a client config example and included `tun-ipv6`, which is not part of current OpenVPN 2.6 help output. The example was corrected to use `push "redirect-gateway ipv6"` as a server-side example and `redirect-gateway ipv6` as the client-side directive.
- The connect/disconnect script example wrote files under `/etc/openvpn/` without `sudo`, used inconsistent path comments, and omitted the OpenVPN config directives needed to call the scripts. The commands and comments were corrected, and `script-security 2`, `up`, and `down` directives were added.
- The DNS section incorrectly said the `dig` commands show which DNS server is being used. They actually show the public IP seen by a known resolver. The wording was corrected, `dig -6` was added to force IPv6 transport for the IPv6 query, and the `tcpdump` filter was widened from `udp port 53` to `port 53` to catch both UDP and TCP DNS.

## Review Notes
- OpenVPN 2.6 also documents a native `block-ipv6` option that can be useful when the goal is to prevent IPv6 leaks without custom firewall rules.
- The `validation` status is `validated` because the post was technically relevant and the identified inaccuracies were corrected in place.
