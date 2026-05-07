# Validation Summary: How to Set Up a 6in4 Tunnel with Hurricane Electric for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Hurricane Electric Tunnelbroker
- IPv6
- IPv6-over-IPv4 (`6in4` / `sit`) tunneling
- Linux `iproute2`
- Debian/Ubuntu `ifupdown`
- Netplan
- `iptables`

## Sources Consulted
- Hurricane Electric Tunnelbroker: https://tunnelbroker.net/
- Hurricane Electric Tunnelbroker FAQ: https://ipv6.he.net/certification/faq.php
- Debian `ifupdown` `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Debian IPv6 wiki: https://wiki.debian.org/DebianIPv6
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Debian `ip-tunnel(8)` man page: https://manpages.debian.org/testing/iproute2/ip-tunnel.8.en.html
- RFC 4213, Basic Transition Mechanisms for IPv6 Hosts and Routers: https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 3056, Connection of IPv6 Domains via IPv4 Clouds: https://www.rfc-editor.org/rfc/rfc3056
- RFC 7526, Deprecating the Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc7526.html
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 4443, ICMPv6 for the Internet Protocol Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc4443.html
- Local command help checked for current syntax: `ip -6 route help`, `ping -h`, `iptables -h`

## Issues Found
- The prerequisites said the tunnel "must be a public IP, not NAT". Hurricane Electric's FAQ is more specific: Tunnelbroker uses your public IPv4 endpoint, and NAT setups usually fail unless the appliance can allow and forward IP protocol 41. I corrected that note so it matches HE's documented behavior.
- The Linux `ip tunnel add` example used line continuations followed by inline shell comments. In Bash that breaks the continued command and can cause later tokens to be executed separately. I moved those comments out of the continued lines so the command is valid shell syntax.
- The manual route example added the IPv6 default route with `dev he-ipv6` only, but the post later said the route table should show `::/0 via ... dev he-ipv6`. I changed the command to add the default route explicitly via the HE server's IPv6 address so it matches the later verification step and the gateway-based configuration used elsewhere in the post.
- The `/etc/network/interfaces` example manually created and deleted the tunnel with `pre-up` and `post-down` hooks even though the `inet6 v4tunnel` method already supports `endpoint`, `local`, `gateway`, `ttl`, and `mtu` directly. I removed the redundant hooks and used the native `mtu 1480` option instead.
- The MTU test used `ping -6 -s 1452 -M do` after setting the tunnel MTU to 1480. With `ping -s`, Linux expects payload bytes, so the unfragmented ICMPv6 payload limit is 1432 bytes on a 1480-byte IPv6 MTU (`1480 - 40 byte IPv6 header - 8 byte ICMPv6 header`). I corrected the payload size to `1432`.

## Review Notes
- The `iptables` examples are still valid on modern Debian/Ubuntu systems, but Debian now recommends `nftables` as the default firewall framework. The current post remains technically correct as written.
- Tunnelbroker advertises `/48` availability once a tunnel is established. The post's focus on the tunnel `/64` and routed `/64` is still accurate for the basic setup it describes.
