# Validation Summary: How to Configure PTP (Precision Time Protocol) with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- PTP (Precision Time Protocol, IEEE 1588)
- linuxptp (ptp4l, phc2sys, pmc)
- IPv6 / UDPv6 transport
- Multicast (FF0E::181, FF02::6B)
- systemd unit configuration
- tcpdump (for verification)

## Sources Consulted
- IEEE 1588-2008 / IEEE 1588-2019 (PTP standard, Annex E - UDP/IPv6 mapping and multicast addresses)
- linuxptp project documentation and source: https://linuxptp.nwtime.org/
- ptp4l(8), phc2sys(8), pmc(8) man pages
- linuxptp default.cfg and ptp4l.conf configuration option reference
- RFC 8173 — Precision Time Protocol Version 2 over IPv6
- tcpdump pcap-filter(7) documentation (operator precedence)
- iproute2 ip-maddress(8) documentation

## Issues Found

1. **tcpdump filter precedence bug** (Verifying PTP over IPv6 section):
   - The filter `ip6 and udp port 319 or udp port 320` is parsed as `(ip6 and udp port 319) or (udp port 320)` because AND binds tighter than OR in pcap-filter syntax. This would also match IPv4 traffic on port 320.
   - Fixed by wrapping the alternation in parentheses and quoting the filter: `'ip6 and (udp port 319 or udp port 320)'`.

2. **Misleading comment on multicast address** (PTP Multicast Addresses for IPv6 section):
   - The comment claimed `FF0E::181` was for "PTP domain 0 (all nodes)". In reality, FF0E::181 is the primary PTP IPv6 multicast address used by all PTP nodes regardless of domain — the domain number is encoded in the PTP message header per IEEE 1588 Annex E, not in the multicast address.
   - Updated the comment to clarify this and added the FF02::6B peer-delay multicast address (used by the P2P delay mechanism) for completeness.

## Review Notes

- `masterOnly` and `slaveOnly` config options shown in the post still work in current linuxptp, but newer linuxptp releases prefer the inclusive names `serverOnly` / `clientOnly`. Both names are accepted, so no code change is needed, but readers using very recent linuxptp may see deprecation messages.
- The example uses `priority1 128` / `priority2 128` (the protocol defaults) for the master node. To bias BMCA selection toward this node you would typically lower these values (e.g., `priority1 64`); the post relies on `--masterOnly` to force the role, which is fine but worth noting for multi-master scenarios.
- `phc2sys -s eth0 -c CLOCK_REALTIME -O 0 -w` is correct: the `-w` flag tells phc2sys to wait for ptp4l and inherit the UTC offset from it, which overrides the `-O 0` value at runtime.
- `ip -6 maddr add FF0E::181 dev eth0` works for adding the address to the interface's multicast list, but actual joining of the IPv6 multicast group is normally performed by ptp4l via setsockopt(IPV6_JOIN_GROUP). The example is illustrative as the post itself notes ("usually done by ptp4l").
- UDP port 320 carries Announce, Sync (when two-step), Follow_Up, Delay_Resp, and management/signaling messages — the post lists "Announce, Follow_Up" which is a representative subset rather than exhaustive; not incorrect.
