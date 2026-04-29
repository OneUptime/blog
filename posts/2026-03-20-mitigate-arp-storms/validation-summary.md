# Validation Summary: How to Mitigate ARP Storms on a Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ARP (Address Resolution Protocol)
- IPv4 subnetting
- Python `ipaddress` module
- Cisco IOS (Dynamic ARP Inspection, errdisable recovery, Spanning Tree PortFast, BPDU Guard)
- Linux kernel `proxy_arp` sysctl
- VXLAN / overlay networking (`ip link`, `bridge fdb`)
- tcpdump, awk, pv (packet capture and analysis tools)

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Cisco Dynamic ARP Inspection configuration guide (Catalyst switches): https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/sec/b_173_sec_9300_cg/configuring_dynamic_arp_inspection.html
- Cisco `errdisable recovery` reference (`errdisable recovery cause arp-inspection`)
- Cisco Spanning Tree PortFast and BPDU Guard configuration documentation
- Linux kernel `Documentation/networking/ip-sysctl.txt` for `proxy_arp`
- iproute2 `ip-link` and `bridge` man pages for VXLAN parameters (`nolearning`, FDB defaults)
- tcpdump man page for `-n`, `-q`, `-i` flags and ARP output format
- RFC 826 (ARP) and RFC 7348 (VXLAN) for protocol-level claims

## Issues Found

1. **Incorrect /24 subnet count for a /16 network.** The text stated "128 /24 subnets with 254 hosts each" when describing the result of subdividing a /16. A /16 actually contains 2^(24-16) = 256 /24 subnets — and the Python snippet immediately below (`ipaddress.ip_network('10.0.0.0/16').subnets(new_prefix=24)`) would print 256, contradicting the prose. Changed "128" to "256" so the prose matches both arithmetic and the example output.

2. **Broken ARP-rate detection script (`awk '{print $4}'`).** tcpdump's ARP request lines look like `... ARP, Request who-has 10.0.0.5 tell 10.0.0.1, length 28`, so `$4` is the literal token `who-has`, not the sender IP. Piping `who-has` through `sort | uniq -c` would just count packets under a single bogus key, never producing per-host rates and never firing the threshold logic as described. Replaced the field-4 extraction (and the no-op `while read; do echo; done` pass-through) with `awk '/Request/ {gsub(",", "", $7); print $7}'`, which filters to ARP requests and pulls the sender IP from field 7 with the trailing comma stripped. Verified the corrected pipeline against representative tcpdump output.

## Review Notes

- The Cisco snippets (`ip arp inspection limit rate`, `errdisable recovery cause arp-inspection`, `spanning-tree portfast`, `spanning-tree bpduguard enable`) are valid IOS syntax and remain current. ARP rate limiting via DAI requires DAI itself to be enabled on the relevant VLAN(s) — readers following this post in isolation may need to enable `ip arp inspection vlan <id>` first; the post's "Related Reading" link to a dedicated DAI post covers that.
- The VXLAN snippet uses `ip link set vxlan0 type vxlan ... nolearning` with literal ellipses, which is illustrative rather than copy-pasteable; this matches the rest of the post's tone and was left unchanged. The `bridge fdb append 00:00:00:00:00:00 dev vxlan0 dst 0.0.0.0` line uses `0.0.0.0` as a placeholder for the remote VTEP / multicast group address — in production you would substitute a real unicast or multicast destination. Left as-is since the surrounding prose makes the illustrative intent clear.
- The proxy_arp sysctl path (`/proc/sys/net/ipv4/conf/<iface>/proxy_arp`) is correct and stable across modern kernels.
- The tcpdump-based detection commands (`pv -r`, `timeout 5 ... | wc -l`) are correct and current.
