# Validation Summary: How to Export IPv6 Packet Data from Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (GUI)
- tshark (CLI)
- IPv6 protocol (display filters: `ipv6.src`, `ipv6.dst`, `ipv6.hlim`, `ipv6.plen`, `ipv6.nxt`)
- ICMPv6 / Neighbor Discovery Protocol (NDP)
- DHCPv6
- pcap / pcapng file formats
- Output formats: CSV, JSON, JSON-raw, PDML (XML), hex dump
- Shell scripting (bash)
- `xxd` utility

## Sources Consulted
- tshark(1) man page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference — DHCPv6: https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- Wireshark Display Filter Reference — ICMPv6: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- Wireshark Display Filter Reference — IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html

## Issues Found
No technical issues found.

Verification details:
- `tshark` options `-r`, `-Y`, `-w`, `-T`, `-e`, `-E`, `-q`, `-z` are all valid and used correctly.
- `-T` output formats `fields`, `json`, `jsonraw`, `pdml` are all documented in the official man page (`jsonraw` has been available since Wireshark 2.6).
- `-E` sub-options `header=y`, `separator=,`, `quote=d`, `occurrence=f` match the documented values.
- `-z conv,ipv6` is a valid conversation statistic.
- Display filter field names verified in the official Display Filter Reference:
  - `ipv6`, `ipv6.src`, `ipv6.dst`, `ipv6.hlim`, `ipv6.plen`, `ipv6.nxt` — valid IPv6 fields.
  - `icmpv6`, `icmpv6.type`, `icmpv6.nd.ns.target_address`, `icmpv6.nd.na.target_address` — valid ICMPv6 / NDP fields.
  - `dhcpv6`, `dhcpv6.msgtype`, `dhcpv6.iaaddr.ip`, `dhcpv6.duidllt.link_layer_addr` — valid DHCPv6 fields.
- GUI step "File → Export Specified Packets" with **Displayed** packet range is correct for Wireshark.
- Bash script uses standard POSIX parameter expansion (`${INPUT_PCAP%.pcap}`) correctly.

## Review Notes
- The `xxd` pipeline (`tshark -w - | xxd`) hex-dumps the entire pcap stream (including the pcap file header and per-packet record headers), not only payload bytes. The section title "Export Raw Packet Bytes" accurately describes this, so no change is needed, but readers wanting only payload octets should use `-T fields -e data` (which the post also demonstrates).
- The post uses the newer display-filter prefix `dhcpv6` (renamed from `bootp`/`dhcp`-style in older Wireshark versions). This is correct for current Wireshark releases (3.x and 4.x).
- `icmpv6.nd.ns.target_address` / `icmpv6.nd.na.target_address` apply only to Neighbor Solicitation (type 135) and Neighbor Advertisement (type 136) messages respectively; for rows with other ICMPv6 types those columns will be empty — expected behavior, worth noting for readers analyzing the CSV.
- No deprecated options were used and all commands should work on currently supported Wireshark/tshark releases.
