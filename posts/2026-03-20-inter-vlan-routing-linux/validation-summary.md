# Validation Summary: How to Set Up Inter-VLAN Routing on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- IEEE 802.1Q VLANs
- `iproute2`
- IPv4 forwarding (`sysctl`)
- `iptables` / netfilter

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `iptables(8)` manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `sysctl.d(5)` manual page: https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- Netfilter packet-filtering HOWTO: https://netfilter.org/documentation/HOWTO/packet-filtering-HOWTO-7.html
- Local command help checked for syntax: `ip link help vlan`, `iptables -m conntrack -h`, `sysctl --help`

## Issues Found
- The original `iptables` example did not make the filtering policy self-contained. Without a `FORWARD` chain default-drop policy, traffic not matched by the explicit rules could still be accepted depending on the host's existing firewall policy. I fixed this by adding `iptables -P FORWARD DROP`, adding a standard `-m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT` return-traffic rule, and replacing the older `state` matcher usage with `conntrack` syntax so the example matches current documented netfilter usage.

## Review Notes
- The guide is IPv4-only. Equivalent IPv6 inter-VLAN routing would require IPv6 addresses on the VLAN interfaces and enabling IPv6 forwarding separately.
- The `iptables` rules shown affect the running ruleset only. Persisting firewall rules is distro-specific and is not covered by the post.
