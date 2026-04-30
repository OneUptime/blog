# Validation Summary: How to Troubleshoot IPv6 NDP Failures

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- Neighbor Discovery Protocol (NDP)
- ICMPv6
- Linux `iproute2`
- `ndisc6`
- `tcpdump`
- `ip6tables`
- Linux sysctl networking settings

## Sources Consulted
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls": https://datatracker.ietf.org/doc/html/rfc4890
- `ip-neighbour(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `ndisc6(8)` Ubuntu manpage: https://manpages.ubuntu.com/manpages/resolute/man8/ndisc6.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `pcap-filter(7)` Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The `ip -6 neigh` filtering examples used invalid syntax (`state REACHABLE` and `state FAILED`). Current `iproute2` uses `nud <state>` for show/flush filtering, so I corrected those commands to `ip -6 neigh show nud reachable`, `ip -6 neigh show dev "$IFACE" nud failed`, and `ip -6 neigh flush nud failed dev eth0`.
- The `ndisc6` examples and script used `-m` as if it accepted a retry count. Per the `ndisc6(8)` documentation, `-m` means "multiple advertisements" and takes no argument, while `-r` controls retry attempts. I replaced `-m 3` with `-r 3` and updated the script to use `-q -r 2 -w 2000`.
- The timeout explanation for `ndisc6` was too narrow. A timeout can mean the target is down, ICMPv6 is being filtered, or the address is not on the local link, so I corrected that note to match `ndisc6`'s documented on-link behavior.
- The re-resolution example used `ping6`, which current `iputils` documents as merged into `ping`. I updated the example to `ping -6 -c 1`.
- The diagnostic script's final `grep` pattern could miss common `ip6tables` protocol spellings such as `icmpv6` or `ipv6-icmp`. I broadened it to `grep -Ei "icmp|neighbor"` so the rule listing is more reliable.
- The conclusion claimed firewall blocking was "the most common cause" of NDP failure. That ranking is not something the standards or man pages establish, so I softened it to "a common cause" while keeping the core guidance intact.

## Review Notes
- The post remains Linux-focused. On newer systems, administrators may manage IPv6 filtering through `nftables` or higher-level frontends such as `firewalld`, even though the `ip6tables` examples are still valid.
- `ndisc6` only tests on-link neighbor discovery. It is not a generic reachability probe for off-link IPv6 destinations.
