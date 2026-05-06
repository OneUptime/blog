# Validation Summary: How to Configure Destination NAT (DNAT) on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux netfilter NAT
- `iptables` DNAT rules and `FORWARD` filtering
- `nftables` DNAT rules
- Linux IPv4 forwarding (`/proc/sys/net/ipv4/ip_forward`)
- `conntrack-tools`

## Sources Consulted
- `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter NAT HOWTO, packet flow and DNAT/redirect behavior: https://www.iptables.org/documentation/HOWTO/NAT-HOWTO-5.html
- Netfilter NAT HOWTO, DNAT and REDIRECT examples: https://www.iptables.org/documentation/HOWTO/NAT-HOWTO-6.html
- `iptables-extensions(8)` man page, DNAT target and conntrack state documentation: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `conntrack(8)` man page, `--dst-nat` filter: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- Linux kernel IP forwarding sysctl documentation: https://docs.kernel.org/6.4/networking/ip-sysctl.html
- Local CLI help/output checked in this environment: `iptables -j DNAT -h`, `iptables -m conntrack -h`, and `iptables-translate`

## Issues Found
- The opening explanation overstated DNAT as a PREROUTING-only operation. DNAT is commonly used in PREROUTING for transit traffic, but it can also be used in OUTPUT for locally generated traffic. I corrected the wording so it matches netfilter behavior.
- The `iptables` forwarding examples only allowed the inbound leg of the forwarded connection. I added `FORWARD` rules using `-m conntrack --ctstate NEW` for the inbound leg and `ESTABLISHED,RELATED` for return traffic so the examples are complete for restrictive `FORWARD` policies.
- The `nftables` example used `table inet nat` with bare `dnat to` rules for IPv4 addresses. In an `inet` NAT table, IPv4-address DNAT requires an explicit family qualifier. I changed the example to `table ip nat`, which makes the posted syntax valid and avoids the family ambiguity.
- The transparent proxy example tried to "Exclude local traffic" with a PREROUTING rule placed after the DNAT rule and matched the proxy host's own address. Locally generated traffic does not traverse PREROUTING, and the exemption must be evaluated before the DNAT rule. I changed the example to exempt a specific LAN host before applying DNAT to the proxy.
- The verification step used `conntrack -L | grep DNAT`, which is not the native conntrack filter and is less reliable than the tool's built-in NAT selectors. I replaced it with `conntrack -L --dst-nat`.
- The key takeaway said to always add a `FORWARD` rule. I narrowed that to the technically correct condition: add the rule when the `FORWARD` policy is restrictive.

## Review Notes
- `echo 1 > /proc/sys/net/ipv4/ip_forward` is technically correct, but it is a runtime change and is not persistent across reboots.
- `REDIRECT` is a specialized form of DNAT for sending traffic to the local machine and is often a better fit for transparent proxies. The post is still technically valid using DNAT to a local address, so the section was kept as a DNAT example.
- The public IP addresses in the examples are from the documentation range `203.0.113.0/24`; readers need to replace them with real addresses in production.
