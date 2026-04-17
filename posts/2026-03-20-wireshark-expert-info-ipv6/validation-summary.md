# Validation Summary: How to Use Wireshark Expert Info for IPv6 Diagnostics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (GUI) — Expert Information dialog
- tshark (CLI) — `-z expert`, display filter fields
- Wireshark display filter language (`_ws.expert`, `_ws.expert.severity`, `_ws.expert.group`, `_ws.expert.message`, `ipv6`, `ipv6.fraghdr`, `tcp.analysis.*`)
- ICMPv6 (RFC 4443)
- Bash scripting for report generation

## Sources Consulted
- Wireshark User's Guide — Expert Information: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvExpert.html
- tshark man page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Display Filter Reference — IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html
- RFC 4443 (ICMPv6) — confirmed message type values (Type 1 Destination Unreachable, Type 2 Packet Too Big, Type 3 Time Exceeded, Type 4 Parameter Problem)

## Issues Found

1. **Incorrect severity colors and level name for Expert Info.** The post stated Note is blue and Chat is grey. Per the official Wireshark docs, the four severity tiers are Chat (blue), Note (cyan), Warn (yellow), Error (red). Also renamed "Warning" to "Warn" to match the actual label used in Wireshark. Fixed.

2. **Unsupported keyboard shortcut.** The post claimed `Shift+Ctrl+E` opens Expert Info. This is not a documented default shortcut in current Wireshark. Replaced with the status-bar indicator method (clicking the expert level indicator in the lower-left), which is documented. Also renamed the menu entry from "Expert Info" to "Expert Information" to match current Wireshark UI.

3. **Misuse of `tshark -G expert`.** The post used `tshark -r capture.pcap -Y "ipv6" -G expert` to "get all Expert Info events from an IPv6 capture." The `-G` flag is a glossary mode that dumps internal definitions and exits — it does not read capture files, so `-r` and `-Y` are ignored. Replaced with a correct command that uses `-Y "_ws.expert && ipv6"` with `-T fields`, and added an `-z "expert,note,ipv6"` example for IPv6-filtered summary statistics.

## Review Notes

- The ICMPv6 type numbers (1–4) are correct per RFC 4443.
- The `tcp.analysis.*` filter fields (retransmission, fast_retransmission, zero_window, duplicate_ack) are valid Wireshark display filter fields.
- `ipv6.fraghdr` is a valid label-type field in the IPv6 dissector and works as a presence test. An alternative equally valid filter is `ipv6.nxt == 44`.
- `_ws.expert`, `_ws.expert.severity`, `_ws.expert.group`, and `_ws.expert.message` are correct Wireshark expert-info display filter fields.
- The `tshark -z expert[,level[,filter]]` syntax is correct; the post now demonstrates both the unfiltered and IPv6-filtered forms.
- "Chat" severity is technically flagged as blue by the docs, but in practice some themes render it closer to grey — the change to "blue" aligns with the official documentation.
