# Validation Summary: How to Capture ARP Packets with tcpdump

## Status
validated

## Post Type
Tutorial / packet-capture guide

## Technologies Covered
- ARP
- Ethernet
- IPv4
- `tcpdump`
- libpcap / BPF filter syntax
- Bash
- `awk`

## Sources Consulted
- `tcpdump(8)` local man page for `tcpdump` 4.99.4 and local `tcpdump --version` output
- `pcap-filter(7)` local man page from libpcap 1.10.4
- RFC 826: An Ethernet Address Resolution Protocol: https://www.rfc-editor.org/rfc/rfc826.html
- RFC 5227: IPv4 Address Conflict Detection: https://www.rfc-editor.org/rfc/rfc5227
- Related OneUptime posts were checked locally in the repository to confirm the referenced paths exist

## Issues Found
- The “specific IP” filter used `arp[28:4]`, which is not the sender IP field in Ethernet/IPv4 ARP. Updated it to check `arp[14:4]` and `arp[24:4]`, which are the sender and target IPv4 address fields defined by the ARP packet layout.
- The “real time” counting pipeline was not technically correct. `awk '{print $4}'` does not reliably identify the ARP host/IP in normal `tcpdump` ARP output, and `sort | uniq -c | sort -rn` only produces output after end-of-file rather than continuously. Replaced it with a line-buffered `tcpdump` stream and an `awk` counter that emits running counts as packets arrive.
- The ARP monitoring script said it watched “any new ARP activity,” but it only matched ARP requests. It also relied on GNU-specific `grep -P` parsing and placed `-i eth0` after the filter expression. Updated the comment to match the actual behavior, reordered the `tcpdump` options to documented syntax, added `-l` for line-buffered streaming, and switched field extraction to `awk`.
- The gratuitous ARP explanation was too broad. RFC 5227 describes the common gratuitous-ARP announcement form as an ARP Request where the sender and target IP fields are the same. Updated the wording to reflect that scope.
- The ARP offset table and takeaway text were implicitly presented as if they applied to every ARP variant. RFC 826 allows variable hardware and protocol address lengths, so the sender/target IP offsets shown are specifically for Ethernet/IPv4 ARP. Added that scope note.
- The pcap write command placed `-w` after the filter expression. Reordered it to documented `tcpdump` option-before-expression form.

## Review Notes
The post is now technically sound for standard Ethernet/IPv4 ARP capture with `tcpdump`. The byte-offset examples should not be generalized to non-Ethernet or non-IPv4 ARP without recalculating offsets from the `ar$hln` and `ar$pln` values described in RFC 826.
