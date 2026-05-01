# Validation Summary: How to Understand DHCPv6 Relay Message Format

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- DHCPv6 relay agents and relay message encapsulation
- IPv6 addressing semantics in relay headers
- Wireshark/TShark
- Python
- Scapy

## Sources Consulted
- IETF RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.ietf.org/rfc/rfc8415.html
- IANA DHCPv6 Parameters registry: https://www.iana.org/assignments/dhcpv6-parameters/dhcpv6-parameters.xhtml
- RFC 4580, DHCPv6 Relay Agent Subscriber-ID Option: https://www.rfc-editor.org/rfc/rfc4580.html
- RFC 4649, DHCPv6 Relay Agent Remote-ID Option: https://www.rfc-editor.org/rfc/rfc4649.html
- RFC 6939, Client Link-Layer Address Option in DHCPv6: https://www.rfc-editor.org/rfc/rfc6939.html
- Scapy 2.7.0 DHCPv6 API reference: https://scapy.readthedocs.io/en/stable/api/scapy.layers.dhcp6.html
- Wireshark `tshark` manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark DHCPv6 display filter reference: https://www.wireshark.org/docs/dfref/d/dhcpv6.html

## Issues Found
- The post stated that relay `hop-count` has a maximum of 32. RFC 8415 defines relay handling so that a relay discards a received `RELAY-FORW` with `hop-count >= 8`. I corrected the field description and conclusion accordingly.
- The `link-address` and `peer-address` descriptions were oversimplified. I updated them to match RFC 8415: `link-address` identifies the client link for the server, and `peer-address` is the source address of the client or relay from which the message was received.
- The relay option table incorrectly listed option code `4` as `Preference`, and `Preference` is not a relay-specific option. I replaced that row with option `79` (`Client Link-Layer Address`), which is a real relay-related option.
- The nested relay example incorrectly showed the outer relay setting `link-address` to its own address. Under RFC 8415 relay-to-relay forwarding rules, when the previous relay used a GUA/ULA source address, the outer relay sets `link-address` to `0`. I corrected the example and explanatory sentence.
- The Scapy example was not valid against Scapy 2.7.0. `DHCP6_RelayForward` does not expose a `relay.options` list, and the class name is `DHCP6OptRemoteID`, not `DHCP6OptRemoteId`. I rewrote the snippet to use the real Scapy API by traversing chained payload layers.
- The RELAY-REPL explanation implied that a relay always forwards the decapsulated message directly to the client. I corrected it to reflect actual behavior: the relay forwards to the address in `peer-address`, which may be a previous relay or the client.

## Review Notes
- RFC 8415 is technically correct for the behaviors described in the post, but it has been obsoleted by RFC 9915 as of January 2026. The relay-message semantics reviewed here remain consistent with the newer base DHCPv6 specification.
- `tshark` was not installed in the local workspace, so command syntax and field names were verified against the official Wireshark man page and display-filter reference rather than by local execution.
- The Scapy example was validated locally against Scapy 2.7.0 objects and packet parsing behavior.
