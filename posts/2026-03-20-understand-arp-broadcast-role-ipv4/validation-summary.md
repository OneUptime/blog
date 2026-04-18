# Validation Summary: How to Understand ARP Broadcast and Its Role in IPv4 Networks

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Address Resolution Protocol (ARP, RFC 826)
- Ethernet (Layer 2 broadcast)
- IPv4 (Layer 3)
- tcpdump (packet capture)
- iproute2 (`ip neigh`)
- iputils `arping`
- Linux `sysctl` / `net.ipv4.neigh.*` kernel parameters
- Gratuitous ARP (VRRP/HSRP, DHCP announcement contexts)

## Sources Consulted
- RFC 826 — An Ethernet Address Resolution Protocol (https://www.rfc-editor.org/rfc/rfc826)
- RFC 5227 — IPv4 Address Conflict Detection (https://www.rfc-editor.org/rfc/rfc5227) for gratuitous ARP semantics
- Linux kernel IP sysctl documentation (https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt) for `gc_stale_time`, `base_reachable_time_ms`
- iputils `arping` man page — `-A`, `-U`, `-I`, `-c` flags
- iproute2 `ip-neighbour(8)` man page — `show`, `flush`, `del`, `add`, `nud permanent`
- tcpdump(1) / pcap-filter(7) — BPF filter syntax for `arp` and `ether dst`
- Live sysctl verification on a Linux host confirming `net.ipv4.neigh.default.gc_stale_time` and `net.ipv4.neigh.default.base_reachable_time_ms` exist as documented.

## Issues Found
No technical issues found.

## Review Notes
- The broadcast MAC `FF:FF:FF:FF:FF:FF`, ARP request/reply opcodes (1/2), hardware type (1 = Ethernet), protocol type (0x0800 = IPv4), HLEN (6), and PLEN (4) all match RFC 826.
- The `tcpdump` invocations, BPF filter (`arp and ether dst ff:ff:ff:ff:ff:ff`), and sample output lines match real tcpdump behavior.
- `ip neigh` commands are correct, including the `nud permanent` state for non-aging static entries.
- `arping -A -I eth0 192.168.1.10 -c 3` correctly sends gratuitous ARP **replies** via iputils arping; `-A` is the documented flag for REPLY-variant unsolicited ARP. The post's simplified definition of gratuitous ARP as "an ARP Reply sent without a prior request" is consistent with the chosen command. Note: gratuitous ARP can also take the form of an ARP **Request** with sender IP == target IP (see RFC 5227 §3 and `arping -U`). This is a minor simplification rather than an error and has been left as written.
- `net.ipv4.neigh.default.gc_stale_time` and `net.ipv4.neigh.eth0.base_reachable_time_ms` are valid per-interface kernel tunables. The inline comment "seconds before removal after reachability unconfirmed" is a slightly informal characterization — strictly, `gc_stale_time` governs how often stale entries are checked/refreshed — but the practical effect on entries that never get confirmed is consistent with the description. Left as written.
- The Mermaid sequence diagram uses `\n` inside participant aliases for line breaks. Some Mermaid versions prefer `<br/>`; rendering varies, but this is a presentation concern, not a technical correctness issue.
