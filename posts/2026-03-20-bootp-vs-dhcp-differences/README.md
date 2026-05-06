# How to Understand BOOTP vs DHCP Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, BOOTP, Networking, Protocol History, IP Addressing

Description: BOOTP was the predecessor to DHCP, providing static IP assignment based on MAC address via UDP broadcasts, while DHCP extended it with dynamic leasing, automatic address pools, and a much richer...

## Historical Context

- **BOOTP** (Bootstrap Protocol, RFC 951, 1985): Designed to allow diskless workstations to boot over the network, providing IP address and boot file information.
- **DHCP** (Dynamic Host Configuration Protocol, RFC 2131, 1997): Built on BOOTP's packet format, adding dynamic address pools, lease times, and extensible options.

## Side-by-Side Comparison

| Feature | BOOTP | DHCP |
|---------|-------|------|
| RFC | 951 | 2131 |
| Address assignment | Static (MAC-to-IP table) | Dynamic pools + reservations |
| Lease concept | No standard lease/renewal mechanism | Time-limited, renewable |
| Option support | Vendor extensions in 64-byte `vend` field | Extensive tagged options in `options` field |
| Configuration update | Manual (server table) | Automatic (pool management) |
| Protocol | UDP 67/68 | UDP 67/68 (same ports) |
| Packet format | Base BOOTP message format | Reuses BOOTP format with DHCP options |

## BOOTP Packet Format (Shared with DHCP)

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  op (1)       |  htype (1)    |  hlen (1)     |  hops (1)     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            xid (4)                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          secs (2)             |      flags/unused (2)         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          ciaddr (4)                           |
|                          yiaddr (4)                           |
|                          siaddr (4)                           |
|                          giaddr (4)                           |
|                          chaddr (16)                          |
|                          sname (64)                           |
|                          file (128)                           |
|            vend (64 in BOOTP) / options (variable in DHCP)   |
```

## How DHCP Extends BOOTP

DHCP uses the same packet format as BOOTP but adds:
1. **Magic cookie** (0x63825363) at the start of the options field, marking RFC 1048/RFC 1497-style options.
2. **Option 53** (DHCP message type) to identify DHCPDISCOVER, DHCPOFFER, and other DHCP messages.
3. **Option 51** (lease time) for DHCP leases - BOOTP did not define DHCP-style renewable leases.
4. **Dynamic pools** - server can assign any available IP from a range.

## BOOTP Relay and DHCP

DHCP relay agents reuse the BOOTP relay model. RFC 2131 explicitly says DHCP captures BOOTP relay-agent behavior, so the same basic relay mechanism is used for both protocols.

## Is BOOTP Still Used?

BOOTP itself is largely obsolete - modern systems use DHCP. However:
- DHCP servers often support BOOTP requests for legacy compatibility.
- Because BOOTP and DHCP use the same UDP ports, the same `port 67 or port 68` filter commonly captures both kinds of traffic.
- ISC `dhcpd` can serve BOOTP clients; `allow bootp;` controls BOOTP replies, and BOOTP queries are allowed by default.

## Key Takeaways

- DHCP is built on BOOTP, sharing the same UDP ports and base message structure.
- BOOTP typically used static MAC-to-IP tables; DHCP introduced dynamic address pools with lease times.
- The 0x63825363 magic cookie marks the RFC 1048-style options area; DHCP packets are identified by the DHCP message type option.
- Relay agents handle both because DHCP reuses BOOTP relay behavior.
