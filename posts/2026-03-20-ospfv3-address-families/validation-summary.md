# Validation Summary: How to Understand OSPFv3 Address Families

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OSPFv3 (RFC 2740)
- RFC 5838 (Support of Address Families in OSPFv3)
- Cisco IOS-XE OSPFv3 unified address-family configuration
- FRRouting (ospf6d)
- IPv4 and IPv6 unicast/multicast routing

## Sources Consulted
- RFC 5838: Support of Address Families in OSPFv3 — https://datatracker.ietf.org/doc/html/rfc5838
- Cisco IP Routing Configuration Guide, IOS-XE 17.x — OSPFv3 Address Families — https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-ospfv3-add-fam-xe.html
- Cisco Press: OSPFv3 Configuration — https://www.ciscopress.com/articles/article.asp?p=3188198&seqNum=4
- FRRouting ospf6d documentation — https://docs.frrouting.org/en/latest/ospf6d.html
- NetworkLessons: OSPFv3 Instance ID — https://notes.networklessons.com/ospfv3-instance-id

## Issues Found

1. **Instance ID address-family ranges were incorrect.** The post listed IPv6 multicast as 64-95, IPv4 unicast as 128-159, and IPv4 multicast as 192-223. RFC 5838 §2.1 actually defines:
   - 0-31: IPv6 unicast AF
   - 32-63: IPv6 multicast AF
   - 64-95: IPv4 unicast AF
   - 96-127: IPv4 multicast AF
   - 128-255: Reserved/unassigned
   Fixed the bullet list to use the RFC 5838 ranges.

2. **`ospfv3 instance-id 10` is not a valid Cisco interface command on its own.** On Cisco IOS-XE, the instance ID is specified as a suffix to the OSPFv3 area assignment (`ospfv3 <pid> {ipv4|ipv6} area <area> [instance <id>]`), not as a separate `instance-id` interface command. Replaced the two-line example with the correct combined form: `ospfv3 1 ipv6 area 0 instance 10`.

## Review Notes
- The "FRRouting Address Family Support" section header is somewhat optimistic — FRR's ospf6d historically does not implement the IPv4 unicast AF from RFC 5838 (FRR uses ospfd / OSPFv2 for IPv4). The example shown in that section is just standard IPv6 OSPFv3 configuration and is technically correct on its own, so no fix was applied, but readers should not infer that this snippet is enabling IPv4 routes through OSPFv3.
- The sample `show ospfv3` output is illustrative and abbreviated (uses `...`); actual output is more verbose but the labels shown are consistent with IOS-XE.
- The post correctly notes that two routers form an OSPFv3 adjacency only when their Instance IDs match, which is the mechanism by which the AF separation works on the wire.
