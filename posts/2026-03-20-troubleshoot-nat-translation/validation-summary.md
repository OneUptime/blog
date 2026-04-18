# Validation Summary: How to Troubleshoot NAT Translation Issues

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Linux IP forwarding (`/proc/sys/net/ipv4/ip_forward`, `sysctl`)
- iptables (nat table: PREROUTING, POSTROUTING; filter FORWARD chain)
- netfilter conntrack (`conntrack` CLI, `nf_conntrack_max`, `nf_conntrack_count`)
- Cisco IOS NAT (`ip nat inside/outside`, `show ip nat translations`, `show ip nat statistics`, `debug ip nat`)
- tcpdump packet capture
- curl (`--interface`), traceroute
- PAT / NAT hairpin / SNAT concepts

## Sources Consulted
- Linux kernel networking docs: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- netfilter conntrack-tools project: https://conntrack-tools.netfilter.org/manual.html
- iptables(8) man page: https://ipset.netfilter.org/iptables.man.html
- Debian/Ubuntu `conntrack` package: https://packages.debian.org/sid/conntrack
- curl manual (`--interface`): https://curl.se/docs/manpage.html
- tcpdump(8) man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- Cisco IOS NAT Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/command/nat-cr-book.html
- Cisco `debug ip nat` reference (requires ACL number/name, not raw IP)

## Issues Found
- **`debug ip nat 192.168.1.10` was invalid Cisco syntax.** The `debug ip nat` command accepts an access-list number (1–2699) or access-list name, not a bare IPv4 address. Passing a dotted IP would be parsed as an ACL name and would not filter debug output to that host unless such an ACL happens to exist. Replaced with the conventional two-step pattern: create a standard ACL matching the host (`access-list 10 permit host 192.168.1.10`), then reference it in `debug ip nat 10`.

## Review Notes
- All Linux commands (`iptables`, `conntrack`, `sysctl`, `tcpdump`, `curl --interface`, paths under `/proc/sys/net/...`) are current and correct.
- `show ip nat translations total` is valid on modern Cisco IOS (available since 12.3(4)T).
- On newer Linux kernels, the nf_conntrack module is typically auto-loaded when NAT rules are added; the `/proc/sys/net/netfilter/` paths referenced are the current canonical locations (older kernels used `/proc/sys/net/ipv4/netfilter/`).
- For persistent conntrack max tuning, adding `net.netfilter.nf_conntrack_max=262144` to `/etc/sysctl.conf` (or a drop-in under `/etc/sysctl.d/`) is preferred over a runtime-only `sysctl -w`; the post's `sysctl -w` example is fine for immediate triage but could mention persistence.
- The post is tagged IPv4; scope is appropriate since NAT in the traditional sense applies to IPv4. IPv6 uses NPTv6/NAT66 which is outside scope.
