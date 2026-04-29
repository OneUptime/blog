# Validation Summary: How to Migrate from MPLS to SRv6

## Status
validated

## Post Type
Technical guide / migration tutorial

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- MPLS / SR-MPLS
- IPv6 Segment Routing Header (SRH, RFC 8754)
- SRv6 Endpoint Behaviors (RFC 8986)
- Cisco IOS XE SRv6 configuration
- Linux kernel SRv6 (seg6 / seg6local)
- iproute2 (`ip -6 route ... encap seg6 / seg6local`)
- IS-IS and OSPFv3 SRv6 extensions
- BGP SRv6 L3VPN (replacing 6PE / 6VPE)

## Sources Consulted
- RFC 8986 — Segment Routing over IPv6 (SRv6) Network Programming
- RFC 8754 — IPv6 Segment Routing Header (SRH)
- RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification (extension headers)
- IANA "SRv6 Endpoint Behaviors" registry
- IANA "Assigned Internet Protocol Numbers" registry (Next Header 43 = Routing)
- Linux kernel commit history for seg6 (4.10) and seg6local (4.14, 5.11, 5.14)
- iproute2 `ip-route(8)` man page (encap seg6 / seg6local syntax)
- traceroute(8) / iputils traceroute6 man page (`-A` flag)
- Cisco IOS XE SRv6 configuration guide

## Issues Found
1. **Incorrect SRv6 endpoint behavior codepoints.** The post listed wrong IANA codepoints for End.T, End.DX6, End.DX4, End.DT6, End.DT4. Per RFC 8986 / IANA "SRv6 Endpoint Behaviors":
   - End.T = 9 (post had 6)
   - End.DX6 = 15 (post had 22)
   - End.DX4 = 16 (post had 21)
   - End.DT6 = 17 (post had 20)
   - End.DT4 = 18 (post had 19)
   
   Fixed the table with correct values, ordered by codepoint, and clarified the heading as "IANA codepoints, RFC 8986". Added a note to the SID examples that "function bits are operator-chosen" so the example values (`:20::` etc.) aren't conflated with IANA codepoints.

2. **Wrong description of `traceroute6 -A` flag.** The post claimed `-A` shows the SRH. In iputils/Dmitry Butskoy traceroute, `-A` performs **AS path lookups** via whois/Cymru (printing `[AS####]` per hop); it does not display the SRH. Removed the `-A` flag and added a comment that traceroute itself does not display the SRH — inspect with tcpdump/wireshark instead.

3. **Misleading Linux kernel version floor.** The post said "Linux kernel supports SRv6 natively (4.10+)" while showing seg6local commands (`encap seg6local action End`, `End.DT6 vrftable`) that require newer kernels. Updated to clarify: source routing 4.10+, seg6local 4.14+, End.DT6 with `vrftable` 5.14+.

4. **Imprecise "Proto 43" comment.** The post said "Proto 43 = IPv6 Routing Header (SRH)". Protocol/Next-Header 43 is the IPv6 **Routing extension header** in general; SRH is specifically Routing **Type 4** (RFC 8754). Clarified the comment.

## Review Notes
- The comparison table calls MPLS labels "32-bit labels". The MPLS label stack entry is 32 bits (4 bytes), but the label field itself is 20 bits. Common shorthand and consistent with the "4-byte label stack" line below, so left as-is.
- The Cisco IOS XE BGP VPNv6 SRv6 snippet uses `address-family vpnv6 unicast` with a nested `vrf CUSTOMER-A`. Cisco's documented per-VRF SRv6 syntax more typically nests `address-family ipv6 unicast` under the VRF block; the snippet works as a high-level illustration but exact ordering may differ across IOS XE versions. Did not change because the snippet is plausible and the post is illustrative; readers should consult their specific platform release notes.
- "OSPF-v3" in the comparison table is more conventionally written "OSPFv3" (no hyphen). Stylistic, not technical — left as-is.
- SRv6 SRH overhead "24+ bytes" is correct for SRH alone with one segment (8-byte base header + 16 bytes per SID). Note this excludes the outer 40-byte IPv6 header that's also added in `mode encap`.
- iproute2 `seg6 mode inline` exists but is generally discouraged for non-local traffic per RFC 8200's restriction on inserting extension headers in transit; the post correctly uses `mode encap`.
