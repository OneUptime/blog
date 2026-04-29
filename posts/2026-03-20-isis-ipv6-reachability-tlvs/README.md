# How to Understand IS-IS IPv6 Reachability TLVs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, IPv6, TLV, Protocol, Networking

Description: Understand the IS-IS TLVs used to carry IPv6 routing information - specifically TLV 232 (IPv6 Interface Addresses) and TLV 236 (IPv6 Reachability).

## Overview

IS-IS communicates routing information through TLVs (Type-Length-Value structures) embedded in Link State PDUs (LSPs). IPv6 support was added by defining new TLVs, allowing IS-IS to carry IPv6 reachability without changing the core protocol.

## Key IPv6 IS-IS TLVs

| TLV Type | Name | RFC | Purpose |
|----------|------|-----|---------|
| 232 | IPv6 Interface Addresses | RFC 5308 | Carries IPv6 interface addresses |
| 236 | IPv6 Reachability | RFC 5308 | Carries reachable IPv6 prefixes |
| 222 | MT Intermediate Systems | RFC 5120 | Multi-topology IS neighbor information |
| 235 | MT IPv4 Reachability | RFC 5120 | IPv4 prefixes in multi-topology mode |
| 237 | MT IPv6 Reachability | RFC 5120 | IPv6 prefixes in non-default multi-topology mode |

## TLV 232: IPv6 Interface Addresses

TLV 232 carries IPv6 interface addresses, but its contents depend on the PDU type. This is equivalent to the IP Interface Address TLV (132) for IPv4:

```yaml
TLV 232 Structure:
+------+--------+------------------------------------------+
| Type | Length |  IPv6 Address (16 bytes per address)     |
| 232  |  N*16  |  fe80::1...                              |
+------+--------+------------------------------------------+
```

In Hello PDUs, TLV 232 contains only the link-local IPv6 addresses assigned to the sending interface. In LSPs, TLV 232 contains only the non-link-local IPv6 addresses assigned to the IS.

## TLV 236: IPv6 Reachability

TLV 236 carries IPv6 prefixes that this router can reach. It is the IPv6 equivalent of TLVs 128/130 (IPv4 Internal/External Reachability):

```yaml
TLV 236 Structure per prefix:
+------------------+--------------------------+------------+--------------------+
| Metric (4 bytes) | Flags (U/X/S + reserved) | Prefix Len | IPv6 prefix bits   |
+------------------+--------------------------+------------+--------------------+
```

If the S bit is set, a 1-byte Sub-TLV length field and Sub-TLVs follow the packed prefix. Link-local prefixes are not advertised in TLV 236. The Up/Down bit prevents routing loops between Level 1 and Level 2 areas.

## TLV 237: MT IPv6 Reachability (Multi-Topology)

For non-default multi-topology IPv6 routing, TLV 237 carries IPv6 prefixes and prepends a 2-byte MT membership field. TLV 236 remains the standard-topology IPv6 reachability TLV:

```yaml
TLV 237 starts with:
+----------------------+------------------------------------------+
| MT membership (2 B) | followed by same format as TLV 236 entries |
+----------------------+------------------------------------------+
```

## Viewing TLVs in IS-IS Database

```text
! Cisco: Show detailed IS-IS database contents to see TLVs
Router# show isis database detail

IS-IS Level-2 Link State Database
LSPID                 LSP Seq Num  LSP Checksum  LSP Holdtime ATT/P/OL
R1.00-00            * 0x00000017   0xd55b        1196         1/0/0

  IPv6 Interface Address: 2001:db8::1
  IPv6 Interface Address: 2001:db8::2
  MT IPv6 Reachability: 2001:db8:1::/64 Metric: 10
  MT IPv6 Reachability: 2001:db8:2::/64 Metric: 20
```

```bash
# FRRouting: Show IS-IS database with TLV details

vtysh -c "show isis database detail"

# Look for:
# IPv6 Interface Addresses TLV:
#   2001:db8::1
#   2001:db8::2
# IPv6 Reachability TLV:
#   2001:db8:1::/64 metric 10
```

## Understanding the Up/Down Bit

The U/D (Up/Down) bit in TLV 236 prevents leaked routes from looping between levels:
- When a Level-2 prefix is leaked down into a Level-1 area, the U/D bit is set to 1
- If a Level-1/2 router sees this prefix with U/D=1, it does NOT leak it back up to Level-2
- This prevents routing loops in hierarchical IS-IS deployments

## Capturing and Analyzing IS-IS PDUs

```bash
# Capture IS-IS PDUs using tcpdump's built-in IS-IS filter
sudo tcpdump -i eth0 -n isis

# Open in Wireshark to decode TLVs visually
sudo tcpdump -i eth0 -w /tmp/isis.pcap isis
# In Wireshark: Filter "isis.lsp.clv.type == 236 || isis.lsp.clv.type == 237" to show IPv6 reachability TLVs
```

## Summary

IS-IS carries IPv6 routing information in TLV 232 (interface addresses) and TLV 236 (reachable prefixes). For non-default multi-topology IPv6 routing, TLV 237 adds the MT membership field ahead of the TLV 236-style reachability data. The Up/Down bit prevents inter-level routing loops. Use `show isis database detail` to inspect TLV contents and verify IPv6 prefixes are being propagated correctly.
