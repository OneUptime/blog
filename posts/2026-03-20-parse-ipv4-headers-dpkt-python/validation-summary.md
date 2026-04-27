# Validation Summary: How to Parse IPv4 Packet Headers Using dpkt in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (type-annotated functions)
- dpkt 1.9.x (packet parsing library)
- Python `socket` standard library (`inet_ntoa`, `inet_aton`)
- Ethernet / IPv4 / TCP / UDP protocols
- PCAP analysis

## Sources Consulted
- dpkt source code and runtime behavior of dpkt 1.9.8 (verified locally via `pip install dpkt`)
- dpkt GitHub repository: https://github.com/kbandla/dpkt
- dpkt documentation: https://dpkt.readthedocs.io/
- Python `socket` module docs: https://docs.python.org/3/library/socket.html#socket.inet_ntoa
- RFC 791 (Internet Protocol) for IPv4 header field semantics
- RFC 793 (TCP) for TCP flag bits (FIN=0x01, SYN=0x02, RST=0x04, PSH=0x08, ACK=0x10)

## Issues Found

1. **`ip.off` is deprecated in dpkt 1.9.8** — accessing `ip.off` now emits a `UserWarning: IP.off is deprecated`. The current dpkt API exposes the individual fragmentation fields directly: `ip.rf` (reserved), `ip.df` (Don't Fragment), `ip.mf` (More Fragments), and `ip.offset` (13-bit fragment offset).
   - Updated the `parse_ethernet_frame` print block to use `ip.df`, `ip.mf`, and `ip.offset` instead of the deprecated `ip.off`.
   - Updated the IPv4 header reference table to replace the `ip.off` row with separate `ip.df`/`ip.mf` (flags) and `ip.offset` (fragment offset) rows.

## Review Notes

- All other dpkt attribute names verified against dpkt 1.9.8: `ip.v`, `ip.hl`, `ip.tos`, `ip.len`, `ip.id`, `ip.ttl`, `ip.p`, `ip.sum`, `ip.src`, `ip.dst` are all correct, as are TCP `sport`/`dport`/`seq`/`ack`/`flags`/`data` and UDP `sport`/`dport`/`ulen`/`sum`.
- TCP flag constants (`dpkt.tcp.TH_SYN`, `TH_ACK`, `TH_FIN`, `TH_RST`, `TH_PUSH`) verified to exist with values matching RFC 793.
- Exception path `dpkt.dpkt.UnpackError` is correct — `dpkt.dpkt` is the inner module containing the base classes/exceptions.
- Protocol numbers in the comment (6=TCP, 17=UDP, 1=ICMP) match IANA assignments.
- `ip.hl * 4` correctly converts the header length field from 32-bit words to bytes.
- `socket.inet_ntoa()` / `socket.inet_aton()` usage is correct for IPv4 4-byte binary addresses.
- The post correctly notes that `eth.data` will be a `dpkt.ip.IP` instance for IPv4 frames; dpkt auto-parses the payload based on the EtherType.
