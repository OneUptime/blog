# Validation Summary: How to Configure IPv6 Stateless Router on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- Linux networking sysctls
- SLAAC
- ICMPv6 Router Advertisements / Neighbor Discovery
- `radvd`
- `iproute2` (`ip`, `ss`)
- `ip6tables`
- `systemd-resolved`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/info/rfc8106
- `radvd.conf(5)` Debian man page: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- `ip-address(8)` Debian man page: https://manpages.debian.org/testing/iproute2/ip-address.8.en.html
- `ss(8)` Debian man page: https://manpages.debian.org/experimental/iproute2/ss.8.en.html
- `iptables-extensions(8)` Linux man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `systemd-resolved.service(8)` documentation: https://www.freedesktop.org/software/systemd/man/253/systemd-resolved.html
- `resolved.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/251/resolved.conf.html

## Issues Found
- The delegated prefix example was internally inconsistent. The post used `2001:db8::/48` but assigned and advertised `2001:db8:1:1::/64`, which is outside that `/48`. I corrected the LAN example to `2001:db8:0:1::/64`.
- The post enabled IPv6 forwarding without accounting for Linux router behavior on WAN RAs. Per kernel documentation, enabling forwarding disables RA processing unless `accept_ra=2` is set. I added the WAN `accept_ra=2` setting and persisted it in the sysctl file.
- The WAN explanation mixed SLAAC, DHCPv6 addressing, and DHCPv6-PD imprecisely. I corrected the wording so the example clearly refers to an upstream delegated prefix via DHCPv6-PD and RA-learned upstream routing.
- The firewall example used the older `state` match and claimed that saving rules to `/etc/ip6tables.rules` alone persisted them across reboot. I updated the example to use `conntrack` and changed the persistence wording to accurately describe it as saving to a file that still needs a distro-specific restore mechanism.
- The DHCPv6 verification command used `ss | grep 547`, which can produce false positives and still prints a header when no socket matches. I replaced it with an `ss` filter that correctly returns no output when UDP port 547 is not listening.
- The optional `systemd-resolved` example was incorrect as written because `systemd-resolved` listens on loopback by default, and the post advertised a DNS address the router had not assigned to itself. I updated the example to use `DNSStubListenerExtra=` and to advertise the router’s configured LAN address as the on-link DNS server.
- The conclusion made an overly broad client-compatibility claim. I narrowed it to the technically accurate requirement that clients support SLAAC and RDNSS-based DNS configuration.

## Review Notes
- The post is technically sound after correction.
- The `ip6tables` examples remain valid, but on many current Linux distributions they are implemented through the nftables backend.
- The firewall section is intentionally minimal. If a deployment uses a default `INPUT DROP` policy on the router itself, it must also allow the required ICMPv6 control traffic and any locally hosted services that should remain reachable.
