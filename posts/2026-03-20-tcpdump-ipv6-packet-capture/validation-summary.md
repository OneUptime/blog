# Validation Summary: How to Use tcpdump for IPv6 Packet Capture

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter BPF syntax
- IPv6
- ICMPv6 and Neighbor Discovery Protocol (NDP)
- Linux and macOS packet capture
- pcap capture files and Wireshark analysis

## Sources Consulted
- Local `tcpdump(8)` man page for tcpdump 4.99.4 and the Tcpdump Group tcpdump man page source: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in
- Local `pcap-filter(7)` man page for libpcap 1.10.4 and the Tcpdump Group libpcap filter man page source: https://raw.githubusercontent.com/the-tcpdump-group/libpcap/master/pcap-filter.manmisc.in
- IANA Assigned Internet Protocol Numbers, including IPv6 Next Header value 58 for IPv6-ICMP: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- IANA ICMPv6 Parameters, including Echo Request/Reply and NDP type numbers 133-137: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- Author GitHub profile link verified: https://github.com/nawazdhandala

## Issues Found
- The ICMPv6 examples used `ip6 proto 58` and `ip6[40]` byte offsets while describing broad ICMPv6/NDP capture. `pcap-filter(7)` documents that `ip6 proto` does not chase the IPv6 extension header chain, and fixed `ip6[40]` offsets only work when the ICMPv6 header immediately follows the fixed IPv6 header. I changed the direct ICMPv6 examples to use `icmp6`, changed type checks to `icmp6[icmp6type]` with libpcap's named ICMPv6 constants, and added `ip6 protochain 58` for cases where extension headers must be followed.
- The "Save with timestamps" example used `-tttt` with `-w`. The tcpdump man page defines `-tttt` as a printed-output timestamp format, while `-w` writes raw packets to a savefile; pcap files include packet timestamps by default. I removed `-tttt` from that save example and corrected the comment.
- The size-rotation example used a `strftime` timestamp pattern with `-C` but no `-G`. tcpdump applies `strftime` naming to time-based rotation with `-G`; `-C` size rotation names files from the `-w` base name. I changed the example to use a plain `/tmp/ipv6.pcap` base name with `-C 100 -W 10`.
- The diagnostic script labeled its summary as NDP traffic but filtered all ICMPv6. I changed the read-side filter to NDP message types 133-137 using `icmp6[icmp6type]`.
- The diagnostic script labeled `awk '{print $3}'` output as unique IPv6 hosts, but that field is only the source endpoint printed by tcpdump. I updated the comment and header to "source endpoints" so the description matches the output.

## Review Notes
- All revised BPF filter expressions were compile-checked locally with `tcpdump -d` against tcpdump 4.99.4/libpcap 1.10.4.
- The examples assume `eth0` exists; users on systems with different interface names should choose the correct interface from their OS or `tcpdump -D`.
- libpcap's ICMPv6 type-code names are available in libpcap 1.9.0 and later; the local validation environment used libpcap 1.10.4.
