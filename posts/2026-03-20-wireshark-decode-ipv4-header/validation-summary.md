# Validation Summary: How to Decode IPv4 Header Fields in the Wireshark Packet Detail Pane

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters and packet detail pane)
- IPv4 protocol (RFC 791)
- Differentiated Services / DSCP (RFC 2474, RFC 2597, RFC 3246)
- ECN (RFC 3168)
- Common transport/encapsulation protocols (ICMP, TCP, UDP, ESP)

## Sources Consulted
- [RFC 791 — Internet Protocol](https://www.rfc-editor.org/rfc/rfc791) (IPv4 header layout, fields, semantics)
- [RFC 2474 — Definition of the DS Field](https://www.rfc-editor.org/rfc/rfc2474) (DSCP/ECN split of TOS byte)
- [RFC 2597 — Assured Forwarding PHB Group](https://www.rfc-editor.org/rfc/rfc2597) (AF codepoints; AF41 = 34)
- [RFC 3246 — An Expedited Forwarding PHB](https://www.rfc-editor.org/rfc/rfc3246) (EF = 46 / 0x2E)
- [IANA Protocol Numbers](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml) (1=ICMP, 6=TCP, 17=UDP, 50=ESP)
- [Wireshark Display Filter Reference: IP](https://www.wireshark.org/docs/dfref/i/ip.html) (verified field names: ip.flags.df, ip.flags.mf, ip.frag_offset, ip.hdr_len, ip.ttl, ip.dsfield.dscp, ip.checksum.status)
- [Wireshark User Guide §7.10 Checksums](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvChecksums.html) (checksum offload behavior)

## Issues Found

1. **Incorrect DSCP value for AF41.** The post stated `0x28 = 40    AF41 (video conferencing)`. Per RFC 2597, AF41 is binary `100010` = decimal 34 = `0x22`. The value 40 (`0x28`) is actually CS5, not AF41. Corrected the table row to `0x22 = 34    AF41 (video conferencing)`.

2. **Invalid Wireshark filter field name.** The post used `ip.checksum_status == "Bad"`. The correct field name in the Wireshark display filter reference is `ip.checksum.status` (with a dot, not an underscore). Corrected to `ip.checksum.status == "Bad"`.

## Review Notes
- All other technical content is correct: header layout bit widths, Wireshark detail-pane formatting (including the `0x40` flags byte representation with 8-bit masks), IHL math (5 × 4 = 20 bytes), TTL OS defaults (Linux 64, Windows 128), the EF DSCP value (46 / 0x2E), and the IANA protocol numbers (1, 6, 17, 50).
- The display filter `ip.checksum.status == "Bad"` works because Wireshark resolves the value-string label to the underlying numeric value (2 = Bad). Using `ip.checksum.status == 2` is equivalent and slightly more portable across UI/CLI usage.
- The comment "Find fragmented packets (DF=0 and MF=1 or offset > 0)" is slightly loose — the filter below it correctly only checks MF/offset and does not require DF=0. Left as-is since it is not technically wrong (DF=1 packets cannot be fragmented in transit), only a minor wording quibble.
- The legacy fields `ip.checksum_bad` / `ip.checksum_good` still exist for backwards compatibility but `ip.checksum.status` is the modern preferred form.
