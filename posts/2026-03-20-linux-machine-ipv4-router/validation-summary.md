# Validation Summary: How to Set Up a Linux Machine as an IPv4 Router

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux kernel IPv4 forwarding
- Linux `iproute2` (`ip addr`, `ip route`)
- `iptables` NAT and forwarding rules
- Debian/Ubuntu `iptables-persistent` and `netfilter-persistent`
- DHCP default gateway configuration
- Netfilter connection tracking

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.11/networking/ip-sysctl.html
- `ip-route(8)` upstream man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` upstream man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Debian `netfilter-persistent(8)` man page: https://manpages.debian.org/buster/netfilter-persistent/netfilter-persistent.8.en.html
- Debian `conntrack(8)` man page: https://manpages.debian.org/testing/conntrack/conntrack.8.en.html
- RFC 2132 DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132

## Issues Found
- The forwarding explanation said Linux "drops" packets between interfaces by default. I changed this to "does not forward" to match the kernel documentation more precisely.
- The routing section omitted the required return path from the upstream side back to `192.168.1.0/24`. I added a note that `10.0.0.1` also needs a route back via `10.0.0.2` unless NAT is used.
- The NAT section presented `MASQUERADE` as the generic solution for any internet gateway. I clarified that `MASQUERADE` is appropriate when the address on `eth1` may change, and that `SNAT` should be used for a static address.
- The reverse-path forwarding rule used the older `state` match syntax. I updated it to `-m conntrack --ctstate RELATED,ESTABLISHED`, which is the current documented conntrack match form.
- The DHCP note used incorrect generic pseudo-syntax (`option router = ...`). I replaced it with a wording that accurately describes advertising `192.168.1.1` as the router/default gateway without tying it to a wrong config syntax.
- The verification step assumed the `conntrack` CLI was present everywhere. I clarified that the command applies when the `conntrack` tool is installed.

## Review Notes
- On current Linux systems, enabling `net.ipv4.ip_forward` also resets related IPv4 host/router sysctl behavior to router defaults, which is expected per kernel documentation.
- On many modern distributions, `iptables` is provided through the nftables backend (`iptables-nft`), but the commands shown in the post remain valid with that backend.
