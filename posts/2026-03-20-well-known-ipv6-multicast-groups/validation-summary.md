# Validation Summary: How to Understand Well-Known IPv6 Multicast Groups (ff02::1, ff02::2)

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv6 multicast addressing
- Neighbor Discovery Protocol (NDP) - RFC 4861
- OSPFv3 - RFC 5340
- RIPng - RFC 2080
- EIGRP for IPv6 - RFC 7868
- PIM - RFC 7761
- mDNS - RFC 6762
- DHCPv6 - RFC 8415
- LLMNR - RFC 4795
- VRRP for IPv6 - RFC 5798 / RFC 9568
- Linux iproute2 (`ip -6 maddr`), `ping6`, `rdisc6`, `tcpdump`, `avahi-browse`, `dns-sd`

## Sources Consulted
- [IANA IPv6 Multicast Address Space Registry](https://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xhtml)
- RFC 4291 (IPv6 Addressing Architecture)
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4795 (Link-Local Multicast Name Resolution)
- RFC 5340 (OSPFv3)
- RFC 2080 (RIPng)
- RFC 6762 (Multicast DNS)
- RFC 8415 (DHCPv6)

## Issues Found

1. **Incorrect assignment of `ff02::1:3`**: The post described `ff02::1:3` as "DHCPv6 Servers Only". Per IANA and RFC 4795, `ff02::1:3` is actually assigned to LLMNR (Link-Local Multicast Name Resolution). The DHCPv6 "All_DHCP_Servers" group is `ff05::1:3` (site-local scope), not link-local. Corrected both the section heading/body and the reference table entry, and added a clarifying note about the DHCPv6 site-scoped address.

## Review Notes

- All other multicast group assignments (`ff02::1`, `ff02::2`, `ff02::4`–`ff02::f`, `ff02::12`, `ff02::fb`, `ff02::1:2`, solicited-node prefix `ff02::1:ff00:0/104`) were verified against the IANA registry and are correct.
- `ping6` is deprecated on modern Linux distributions in favor of `ping` (which handles both v4 and v6) or `ping -6`, but `ping6` still works on most systems and is widely recognized in reference material — left as-is.
- `rdisc6 -1 eth0` is valid; `-1`/`--single` limits to a single probe (equivalent to `-r 1 -w 1`) per the ndisc6 man page.
- The claim that T=0 means "not transient" is consistent with RFC 4291 §2.7 (T flag: 0 = permanently-assigned, 1 = dynamically-assigned).
