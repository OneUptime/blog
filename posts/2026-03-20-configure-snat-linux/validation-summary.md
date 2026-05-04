# Validation Summary: How to Configure Source NAT (SNAT) on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux netfilter (iptables, nat table)
- iptables SNAT and MASQUERADE targets
- nftables (ip family, postrouting hook, srcnat priority)
- IP forwarding (`/proc/sys/net/ipv4/ip_forward`)
- conntrack-tools (`conntrack -L`)
- iptables-persistent / netfilter-persistent (Debian/Ubuntu)
- iptables-services (`service iptables save` on RHEL/CentOS)

## Sources Consulted
- iptables(8) and iptables-extensions(8) man pages — SNAT target syntax and `--to-source` semantics
- netfilter.org documentation on the nat table and POSTROUTING chain
- nftables wiki — Performing Network Address Translation (https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT))
- nft(8) man page — family/hook/priority specifications
- conntrack-tools documentation
- Debian iptables-persistent and RHEL iptables-services package documentation

## Issues Found
- **nftables example used `inet` family with bare `snat to` for an IPv4 address.** In the `inet` family, NAT statements that operate on IPv4 addresses canonically require the family specifier (e.g. `snat ip to ...`); additionally, NAT in the `inet` family is only supported on Linux 5.2+. Changed `table inet nat` to `table ip nat` to make the example portable across kernel versions and remove the ambiguity. While here, also changed `priority 100` to the more idiomatic named alias `priority srcnat` (numerically equivalent).

## Review Notes
- The phrase "distribute outbound traffic across multiple public IPs" for `--to-source IP1-IP2` is correct in spirit but worth understanding: by default, iptables hashes the source address to consistently map a given client to one IP in the range (not round-robin). For most readers this distinction does not change the practical outcome of using a range, so the wording was left as-is.
- `service iptables save` is valid on RHEL/CentOS 6 and on RHEL/CentOS 7 with the `iptables-services` package. RHEL 8+ defaults to nftables/firewalld, so readers on those distributions would need to install `iptables-services` first or use nftables ruleset persistence (`nft list ruleset > /etc/sysconfig/nftables.conf`). The post does not call this out but the command shown is correct where applicable.
- `conntrack -L | grep ESTABLISHED` will surface TCP flows that have reached the ESTABLISHED state but will miss UDP/ICMP NAT sessions. A more complete equivalent is `conntrack -L -p tcp --state ESTABLISHED`. Left as-is since the post's intent is a quick visual check, not exhaustive enumeration.
- The recommended ordering on Debian/Ubuntu is to install `iptables-persistent` first (which writes `/etc/iptables/rules.v4` from the live ruleset on install) and then call `netfilter-persistent save` to refresh. The commands shown work, just in a slightly non-canonical order; functionally equivalent.
