# Validation Summary: How to Understand IS-IS IPv6 Reachability TLVs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IS-IS
- IPv6
- TLVs
- RFC 5308
- RFC 5120
- FRRouting
- Cisco IS-IS CLI
- tcpdump
- Wireshark

## Sources Consulted
- RFC 5308: Routing IPv6 with IS-IS — https://www.rfc-editor.org/rfc/rfc5308
- RFC 5120: M-ISIS: Multi Topology (MT) Routing in Intermediate System to Intermediate Systems (IS-ISs) — https://datatracker.ietf.org/doc/html/rfc5120
- FRRouting IS-IS documentation (`show isis database [detail] [LSPID]`) — https://docs.frrouting.org/en/stable-10.0/isisd.html
- Cisco IOS IP Routing: ISIS Command Reference (`show isis database verbose`) — https://www.cisco.com/c/en/us/td/docs/ios/iproute_isis/command/reference/irs_book/irs_is2.html
- Cisco IOS XE IS-IS configuration guide (`show isis database detail` vs `show isis database verbose`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/configuration/xe-3s/irs-xe-3s-book/irs-ptcl-shtdwn.html
- Wireshark Display Filter Reference for IS-IS LSP fields — https://www.wireshark.org/docs/dfref/i/isis.lsp.html
- Local `pcap-filter(7)` and `tcpdump(8)` documentation, plus local verification with `tcpdump -d`

## Issues Found
- The post identified TLV 235 as multi-topology IPv6 reachability. RFC 5120 defines TLV 235 for multi-topology IPv4 reachability and TLV 237 for multi-topology IPv6 reachability. I corrected the TLV table, section heading, explanatory text, and summary.
- The post said TLV 232 includes both link-local and global addresses and implied link-local addresses are used to form IS-IS adjacencies. RFC 5308 is more specific: Hellos carry only link-local IPv6 addresses for TLV 232, while LSPs carry only non-link-local IPv6 addresses. I corrected the description and removed link-local addresses from LSP database examples.
- The TLV 236 structure was oversimplified in a way that was technically inaccurate. RFC 5308 includes a 4-byte metric, U/X/S flag bits plus reserved bits, a prefix-length field, a packed prefix, and optional Sub-TLV length plus Sub-TLVs only when the S bit is set. I corrected the structure summary and explanatory text.
- The post said TLV 235 replaces TLV 236 in multi-topology mode. For IPv6, TLV 237 is used for non-default MT IDs, while TLV 236 remains the standard-topology IPv6 reachability TLV. I corrected that wording.
- The Cisco example used `show isis database verbose` to inspect TLV contents. Cisco documentation distinguishes `detail` for LSP contents from `verbose` for additional database metadata such as sequence number, checksum, and holdtime. I changed the Cisco example and summary to use `show isis database detail`.
- The packet-capture guidance was incorrect. `proto isis` is not a valid `tcpdump` filter on this system, and the text about EtherType `0x8870` / IP protocol `124` was misleading for normal IS-IS capture. I replaced the commands with the built-in `isis` capture filter and updated the Wireshark display filter to a documented IS-IS LSP field filter.

## Review Notes
- TLV 232 semantics differ by PDU type. The corrected database examples intentionally show only non-link-local IPv6 addresses because the section is about LSP database inspection, not Hello PDU inspection.
