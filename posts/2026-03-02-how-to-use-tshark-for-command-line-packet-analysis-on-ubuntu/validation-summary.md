# Validation Summary: How to Use tshark for Command-Line Packet Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- tshark (Wireshark CLI, version 4.x on Ubuntu 24.04)
- Wireshark display filter syntax
- Berkeley Packet Filter (BPF) capture filter syntax
- pcap file format (including gzip-compressed pcaps)
- TLS / HTTP / HTTP/2 / DNS / ICMP protocol dissectors
- Output formats: fields, json, jsonraw, ek (Elasticsearch), pdml
- Ubuntu package management (apt)

## Sources Consulted
- tshark(1) manpage — https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark display filter reference — https://www.wireshark.org/docs/dfref/
- pcap-filter(7) (BPF syntax) — https://www.tcpdump.org/manpages/pcap-filter.7.html
- Wireshark User's Guide, chapter on tshark statistics (`-z`)
- Ubuntu package metadata for `tshark` (version 4.2.2-1.1build3 on Ubuntu 24.04)
- Wireshark TLS dissector docs (`tls.keylog_file` preference, SSLKEYLOGFILE)

## Issues Found
No technical issues found.

Verified items:
- `sudo apt install tshark` + `wireshark` group setup is the standard Ubuntu install flow.
- All capture flags (`-i`, `-c`, `-a duration:N`, `-a filesize:N`, `-b filesize/files`, `-w`, `-r`) match the tshark manpage.
- BPF capture filters (`tcp port 80`, `host`, `tcp[tcpflags] & tcp-syn != 0`, etc.) are valid pcap-filter syntax.
- Display filter fields (`http.response.code`, `dns.qry.name`, `tcp.analysis.retransmission`, `tcp.analysis.duplicate_ack`, `tcp.window_size`, `tls.handshake.type`, `tls.handshake.ciphersuite`, `tls.handshake.extensions_server_name`, `dns.resp.ttl`, `icmp.type`, `icmp.code`, `http2.header.name/value`) all exist in current Wireshark dissectors.
- Statistics specifiers (`io,phs`, `conv,tcp/udp/ip`, `endpoints,ip`, `http,tree`, `dns,tree`, `expert`, `io,stat,1`) are valid `-z` arguments.
- Output formats `fields`, `json`, `jsonraw`, `ek`, `pdml` are all supported by tshark 4.x.
- `tls.keylog_file` is the correct preference name (renamed from the legacy `ssl.keylog_file`).
- tshark reads gzip-compressed pcaps natively via libwiretap.
- The options reference table accurately reflects the manpage.

## Review Notes
- The `-N FLAGS` row uses shorthand "d=dns, n=network". Per the manpage, `n` is network address resolution and `d` is "resolve from captured DNS packets" (uses DNS responses seen in the capture). The shorthand is reasonable but slightly imprecise — left as-is since it isn't technically wrong.
- The `tshark -D` example output is illustrative; actual ordering varies by system.
- TLS field `tls.handshake.ciphersuite` outputs all offered ciphersuites in a ClientHello (when there are many) and the single negotiated one in a ServerHello — readers should be aware the field may emit multiple values per packet.
- The port-scan detection one-liner uses `awk` on tab-separated tshark fields output; on systems where the default separator differs this could need `-E separator=\\t` explicitly, but tab is the documented default.
- The post does not pin a specific tshark version; everything shown is compatible with 3.x and 4.x.
