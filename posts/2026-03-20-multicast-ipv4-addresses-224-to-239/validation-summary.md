# Validation Summary: How to Identify Multicast IPv4 Addresses (224.0.0.0 to 239.255.255.255)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- IPv4 Multicast addressing (RFC 1112, RFC 5771)
- IGMP (Internet Group Management Protocol)
- OSPF, RIPv2, VRRP, DHCP, SSDP/UPnP multicast usage
- Source-Specific Multicast (SSM, RFC 4607)
- GLOP addressing (RFC 3180)
- Administratively scoped multicast (RFC 2365)
- Linux networking tools (`ip maddr`, `/proc/net/igmp`)
- Python `socket` and `struct` modules for multicast send/receive
- Multicast IP-to-MAC mapping (RFC 1112 Section 6.4)

## Sources Consulted
- RFC 1112 — Host Extensions for IP Multicasting (defines 224.0.0.0/4 and IP-to-MAC mapping)
- RFC 5771 — IANA Guidelines for IPv4 Multicast Address Assignments (range allocations)
- RFC 2365 — Administratively Scoped IP Multicast (239.0.0.0/8)
- RFC 4607 — Source-Specific Multicast for IP (232.0.0.0/8)
- RFC 3180 — GLOP Addressing in 233/8
- RFC 3376 — IGMPv3 (224.0.0.22 for membership reports)
- RFC 2328 — OSPF Version 2 (224.0.0.5 AllSPFRouters, 224.0.0.6 AllDRouters)
- RFC 2453 — RIP Version 2 (224.0.0.9)
- RFC 5798 — VRRPv3 (224.0.0.18)
- IANA IPv4 Multicast Address Space Registry
- Python `socket` and `struct` module documentation
- `ip-maddress(8)` man page

## Issues Found
- **Code block language tag mismatch**: The "Checking Multicast Membership on Linux" section had a single ```bash code block that contained both shell commands AND Python code mixed together. This would render incorrectly (Python imports as bash) and confuse readers. Fixed by splitting into a `bash` block (just the `ip maddr show` and `cat /proc/net/igmp` commands) followed by a separate `python` block for the multicast-join example. Added a brief introductory line "Join a multicast group with Python:" between them. No content was added or removed beyond the formatting fix.

## Review Notes
- All multicast address ranges and well-known addresses verified against IANA registry and the cited RFCs.
- The 224.0.0.0/24 link-local block being non-routable with TTL=1 is correct (RFC 5771 Local Network Control Block).
- IP-to-MAC mapping (low 23 bits onto `01:00:5E:xx:xx:xx`) and the `224.0.0.5 → 01:00:5E:00:00:05` example are correct per RFC 1112 §6.4.
- The Python `struct.pack("4sL", ...)` format is platform-dependent in size on 64-bit Linux (the resulting buffer is 16 bytes due to native alignment, treated by the kernel as `ip_mreqn`), but works correctly because `INADDR_ANY = 0` and the trailing bytes are zeroed. The same idiom appears in the canonical Python multicast examples and was left as-is.
- `socket.setsockopt(..., IP_MULTICAST_TTL, 1)` accepting a bare int is supported by Python's `setsockopt` (it auto-packs small ints); this is correct as written.
- The 224.0.0.22 entry is specifically used by IGMPv3 membership reports — the post's "IGMP membership reports" wording is accurate.
