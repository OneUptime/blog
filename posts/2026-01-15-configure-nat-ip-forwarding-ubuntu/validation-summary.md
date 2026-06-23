# Validation Summary: How to Configure NAT and IP Forwarding on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (20.04+)
- Linux IP forwarding (sysctl / procfs)
- Netplan (network interface configuration)
- iptables / netfilter (NAT, MASQUERADE, SNAT, DNAT, FORWARD)
- nftables (modern netfilter ruleset)
- iptables-persistent
- conntrack (connection tracking)
- tcpdump

## Sources Consulted
- iptables man page and netfilter HOWTOs — https://netfilter.org/documentation/
- nftables wiki (NAT, hooks, priorities, syntax) — https://wiki.nftables.org/wiki-nftables/index.php/Main_Page
- nftables wiki, "Performing Network Address Translation (NAT)" — https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- Linux kernel networking sysctl documentation (ip_forward, conf.all.forwarding) — https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Netplan reference documentation — https://netplan.readthedocs.io/en/stable/netplan-yaml/
- conntrack-tools man page — https://conntrack-tools.netfilter.org/manpage.html
- Ubuntu Server networking documentation — https://documentation.ubuntu.com/server/

## Issues Found
No technical issues found.

All commands, paths, and configuration snippets were verified as correct:
- IPv4/IPv6 forwarding procfs paths (`/proc/sys/net/ipv4/ip_forward`, `/proc/sys/net/ipv6/conf/all/forwarding`) and matching sysctl keys are accurate.
- Netplan YAML (version 2, `dhcp4`, `addresses`, no gateway on LAN interface) is valid for Ubuntu 20.04+.
- iptables MASQUERADE, SNAT (`--to-source`), DNAT (`--to-destination`), and FORWARD/state-match rules are syntactically correct.
- `iptables-persistent` / `rules.v4` persistence workflow is correct.
- nftables ruleset uses correct chain types and hooks, valid standard NAT priorities (dstnat `-100`, srcnat `100`), and correct statements (`masquerade`, `dnat to`, `ct state established,related`, `ip protocol icmp`, `ip6 nexthdr icmpv6`).
- conntrack (`-L`, `-C`), tcpdump, ping/nslookup/curl/traceroute testing commands, and LOG target usage are all accurate.

## Review Notes
- **nftables port-forwarding completeness:** The nftables port-forwarding example (DNAT in the `ip nat` prerouting chain) does not add a corresponding rule to the `forward` filter chain, whose policy is `drop`. Because DNAT'd new connections enter on `eth0` and leave on `eth1`, they would be blocked by the existing forward chain (which only accepts `eth1`→`eth0` plus established/related). The iptables equivalents in the post correctly include the matching `FORWARD ... ACCEPT` rule. This is a real-world completeness gap rather than a syntax error, so the post content was left unchanged; readers using the nftables port-forward example should add a rule such as `iifname "eth0" oifname "eth1" ip daddr 192.168.1.100 tcp dport 80 accept`.
- The nftables `input` chain allows SSH (`tcp dport 22`) on all interfaces including WAN; for a hardened gateway, restricting SSH to the LAN interface (`iifname "eth1"`) would be safer. This is a hardening suggestion, not an error.
- IPv6 forwarding is enabled but only IPv4 NAT is configured. This is intentional and standard practice (IPv6 typically uses routed/public addressing rather than NAT), and the post correctly labels IPv6 forwarding as optional.
- Interface names (`eth0`/`eth1`) are illustrative; modern Ubuntu uses predictable interface names (e.g., `enp3s0`), but the post's use of generic names is a reasonable tutorial convention.
