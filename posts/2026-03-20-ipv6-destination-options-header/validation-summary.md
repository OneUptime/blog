# Validation Summary: How to Understand the Destination Options Header

## Status
validated

## Post Type
Guide / protocol reference

## Technologies Covered
- IPv6
- IPv6 Destination Options extension header
- Mobile IPv6 and the Home Address Option
- Python (`socket`, `struct`)
- `tcpdump` and libpcap BPF filters

## Sources Consulted
- RFC 8200, *Internet Protocol, Version 6 (IPv6) Specification*: https://www.rfc-editor.org/rfc/rfc8200
- RFC 2473, *Generic Packet Tunneling in IPv6 Specification*: https://www.rfc-editor.org/rfc/rfc2473
- RFC 6275, *Mobility Support in IPv6*: https://www.rfc-editor.org/rfc/rfc6275
- RFC 8250, *IPv6 Performance and Diagnostic Metrics (PDM) Destination Option*: https://www.rfc-editor.org/rfc/rfc8250
- RFC 6788, *The Line-Identification Option*: https://www.rfc-editor.org/rfc/rfc6788
- RFC 5570, *Common Architecture Label IPv6 Security Option (CALIPSO)*: https://www.rfc-editor.org/rfc/rfc5570
- RFC 6621, *Simplified Multicast Forwarding*: https://www.rfc-editor.org/rfc/rfc6621
- IANA, *Internet Protocol Version 6 (IPv6) Parameters*: https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- Python documentation, `socket`: https://docs.python.org/3/library/socket.html
- Python documentation, `struct`: https://docs.python.org/3/library/struct.html
- `pcap-filter(7)` manual: https://www.tcpdump.org/manpages/pcap-filter.7.html

## Issues Found
- The Option Type action semantics for `10` and `11` were reversed. I corrected them to match RFC 8200.
- CALIPSO and SMF_DPD were listed as Destination Options, but their defining RFCs specify them as Hop-by-Hop options. I replaced them with actual Destination Options: PDM and the Line-Identification Option.
- The Home Address example used an invalid IPv6 literal (`2001:db8:home::1`), a placeholder `Next Header`, incorrect padding, and the wrong `Hdr Ext Len`. I corrected the sample so it uses a valid IPv6 literal, emits a real `Next Header` value, satisfies the Home Address Option's `8n+6` alignment requirement, and produces a 24-byte Destination Options header.
- The Home Address explanation implied connection-level receiver state changes. I corrected it to match RFC 6275, which specifies per-packet processing and says the option must not alter the receiver's Binding Cache.
- The packet-capture example only matched packets whose base IPv6 `Next Header` was `60`, which misses Destination Options later in the extension-header chain. I clarified that filter and added `ip6 protochain 60` for chain-aware matching.
- The introduction and positional explanation were tightened so they reflect RFC 8200's destination-node processing semantics rather than implying only the final recipient ever processes Destination Options.

## Review Notes
- `ip6 protochain 60` is the more accurate capture filter for Destination Options anywhere in the IPv6 extension-header chain, but `pcap-filter(7)` notes that `protochain` filters are more complex and can be slower.
- The Home Address Option has stricter placement rules than a generic final-destination Destination Options header; the post now calls that out.
