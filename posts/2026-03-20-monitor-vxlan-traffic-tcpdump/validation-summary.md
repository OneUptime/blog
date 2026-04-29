# Validation Summary: How to Monitor VXLAN Traffic with tcpdump

## Status
validated

## Post Type
Tutorial / Reference (cookbook of tcpdump invocations for VXLAN troubleshooting)

## Technologies Covered
- VXLAN (Virtual Extensible LAN, RFC 7348)
- tcpdump / libpcap (BPF filter syntax)
- Linux networking (`ip link`, bridge interfaces, VTEPs, FDB, BUM flooding)
- Wireshark (pcap analysis, `vxlan.vni` display filter)
- pv (pipe-viewer for rate measurement)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN), IANA-assigned UDP port 4789: https://datatracker.ietf.org/doc/html/rfc7348
- tcpdump source: `print-vxlan.c` — confirms output format `VXLAN, flags [I] (0x08), vni N`: https://github.com/the-tcpdump-group/tcpdump/blob/master/print-vxlan.c
- tcpdump source: `print-udp.c` — confirms both 4789 (`VXLAN_PORT`) and 8472 (`VXLAN_LINUX_PORT`) dispatch to `vxlan_print()`: https://github.com/the-tcpdump-group/tcpdump/blob/master/print-udp.c
- tcpdump(1) man page — `-e`, `-v`, `-vv`, `-w`, `-r`, `-c`, `-q` flag semantics: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter(7) — BPF primitives including `udp port`, `host`, `src`, `dst`: https://www.tcpdump.org/manpages/pcap-filter.7.html
- iproute2 `ip-link(8)` — `ip -s link show` statistics output
- Linux kernel VXLAN documentation — head-end replication via zero-MAC FDB entries

## Issues Found
1. **Incorrect sample output protocol name.** The "Decode VXLAN Frames" section showed sample output beginning with `OTV, Flags [I], VNID 100`. Modern tcpdump (since the VXLAN dissector was added) prints `VXLAN, flags [I] (0x08), vni 100` for UDP/4789 traffic. OTV (Overlay Transport Virtualization) is a different protocol, and current tcpdump no longer ships a separate OTV printer — port 8472 (Linux legacy) is also dispatched to `vxlan_print()`. Fixed to match the actual `ND_PRINT` format strings in `print-vxlan.c`.
2. **Misleading description of the `-e` flag.** The comment "Show inner Ethernet headers" was wrong: `-e` prints the link-layer header that tcpdump captured on the wire, which for VXLAN traffic on the physical interface is the *outer* Ethernet frame between VTEPs. The inner Ethernet header is rendered by the VXLAN dissector regardless of `-e`. Updated the comment to clarify this.
3. **"vxlan filter" wording.** The intro sentence "tcpdump with `vxlan` filter decodes the inner frames" misrepresented how the example works — the example uses the `udp port 4789` BPF filter, and dissection is dispatched by UDP port, not by a named filter primitive. (libpcap 1.11+ does add a `vxlan` BPF primitive, but it is not used in the example.) Rephrased to "tcpdump automatically decodes VXLAN inner frames when capturing on UDP port 4789".

## Review Notes
- VXLAN's IANA-assigned UDP port is correctly given as 4789 throughout. Note for future readers: Linux historically used 8472 (the OTV port) as a default before 4789 was standardized; modern kernels default to 4789.
- The "Capture BUM Flooding Traffic" filter `udp port 4789 and dst 10.0.0.2` is reasonable when the remote VTEP at 10.0.0.2 is configured purely as a head-end-replication target via a zero-MAC FDB entry, but in mixed setups it will also capture known-unicast VXLAN traffic to that VTEP. Not a hard error — just a caveat for readers expecting a strict BUM-only filter.
- All tcpdump flags (`-i`, `-n`, `-v`, `-vv`, `-e`, `-w`, `-r`, `-c`, `-q`) and BPF primitives (`udp port`, `host`, `src`, `dst`, `icmp`, `tcp port`) are valid and current in tcpdump 4.99.x.
- `ip -s link show vxlan0`, `watch -n 1`, and `pv -r` are all correct.
- The Wireshark `vxlan.vni == 100` display filter is the correct field name.
