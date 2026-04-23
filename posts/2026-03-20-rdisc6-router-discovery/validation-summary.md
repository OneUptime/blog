# Validation Summary: How to Use rdisc6 for Router Discovery Diagnostics - Router Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 Router Solicitation / Router Advertisement
- `rdisc6` / `ndisc6`
- SLAAC
- DHCPv6
- Linux IPv6 sysctls (`accept_ra`)
- Linux network diagnostics (`tcpdump`, `ip`, `ip6tables`)

## Sources Consulted
- NDisc6 upstream project: https://www.remlab.net/ndisc6/
- NDisc6 upstream source archive reviewed for current `rdisc6` option handling and output strings: https://deb.debian.org/debian/pool/main/n/ndisc6/ndisc6_1.0.8.orig.tar.bz2
- Debian package page for `ndisc6`: https://packages.debian.org/ndisc6
- Ubuntu package information for `ndisc6`: https://launchpad.net/ubuntu/+source/ndisc6
- Fedora package information for `ndisc6` / EPEL builds: https://packages.fedoraproject.org/pkgs/ndisc6/ndisc6/
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106
- Linux kernel IP sysctl documentation (`accept_ra`, `forwarding`, RA-learned routes): https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- `radvd.conf(5)` Debian man page (`IgnoreIfMissing`): https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html

## Issues Found
- The post used `-m` as if it accepted a retry count (`rdisc6 -m 3`, `-m 5`, `-m 2`). Current `rdisc6` uses `-m/--multiple` as a boolean flag, while `-r/--retry` controls retry count. I changed those commands to use `-r` correctly.
- The “use a specific source IPv6 address” example used positional arguments incorrectly (`rdisc6 eth0 fe80::10`). The source address must be passed with `-s`, so I corrected the command to `rdisc6 -s fe80::10 eth0`.
- The sample RA output did not fully match current upstream output. I corrected the solicitation line, the `Stateful other conf.` field name, the `unspecified` text for zero reachable/retransmit timers, and the order of the prefix subfields.
- The Router Lifetime explanation said `0=not a router`. RFC 4861 defines a zero Router Lifetime as “do not use as a default router,” so I corrected that wording.
- The `O`-flag explanation overstated the DHCPv6 implication for DNS. I changed the text to say that other configuration is available via DHCPv6, which is what RFC 4861 defines, without implying DHCPv6 is the only DNS delivery mechanism.
- The “verify RA-assigned addresses” snippet tried to derive a textual prefix and grep for it in `ip -6 addr` output. That is not a reliable way to validate SLAAC addresses from an advertised /64. I replaced it with a reliable inspection flow using `rdisc6 -q`, `ip -6 addr show`, and `ip -6 route show default proto ra`.
- The diagnostic script grepped for `Lifetime` with the wrong case for current `rdisc6` output and pointed only at `FORWARD` for local RA filtering. I corrected the grep and the firewall hint.
- The `radvd` config grep used `IgnoreIf`, which is not the documented option name. I corrected it to `IgnoreIfMissing`.
- The install example used `yum` for a broad “RHEL/CentOS” instruction. I updated it to a current `dnf` example and qualified repository availability so the command is not overstated as universal.

## Review Notes
- `rdisc6 -v` is valid but redundant because verbose output is already the default.
- Exact `rdisc6` output spacing can vary slightly by build or localization; the revised example aligns with current upstream English field names and semantics.
- The `ip6tables` checks remain useful, but systems using native `nftables` may require equivalent `nft` inspection outside the scope of this post.
