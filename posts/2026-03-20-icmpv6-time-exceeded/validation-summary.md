# Validation Summary: How to Understand ICMPv6 Time Exceeded Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6
- traceroute / traceroute6
- tcpdump / libpcap capture filters
- mtr
- Linux networking diagnostics

## Sources Consulted
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- IANA ICMPv6 Parameters - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Debian traceroute(1) / traceroute6(1) manpages - https://manpages.debian.org/testing/traceroute/traceroute.1.en.html and https://manpages.debian.org/testing/traceroute/traceroute6.1.en.html
- libpcap `pcap-filter(7)` man page (mirror) - https://www.mankier.com/7/pcap-filter
- Local `mtr --help`
- Local `tcpdump --help`
- Local `tcpdump -d` filter compilation checks
- Local `/proc/net/snmp6` counter inspection

## Issues Found
- The post said Code 0 replies are sent from the router's ingress interface address. RFC 4443 does not require that; it requires a unicast source address chosen by the responding node. The wording was corrected.
- The post described Code 1 as waiting more than 60 seconds for all fragments, and implied the source had sent all fragments. RFC 8200 defines the timer as 60 seconds from the first-arriving fragment and only requires that reassembly remain incomplete. The wording was corrected.
- The `tcpdump` examples used raw `ip6[...]` offsets for ICMPv6 Type 3 and Code 1 matching. These were replaced with clearer `icmp6[...]` type/code filters, and the fragment-header example was changed to `ip6 protochain 44` for a more accurate match through the IPv6 header chain.
- The traceroute loop-detection pipeline assumed the second field was always an address. `-n` was added so the pipeline works with numeric hop output, and the wording was softened from definite loop detection to possible loop detection.
- The explanation for `*` hop output and the conclusion overstated certainty. Those lines were corrected to reflect that filtering, loss, and ICMPv6 rate limiting can all suppress visible replies.
- The `traceroute6 -I` comment implied a port-availability requirement on the target. It was updated to the technically accurate case: ICMP mode is useful when UDP probes are filtered.

## Review Notes
The commands are Linux-oriented. `traceroute6` is commonly available as an alias for `traceroute -6`, but some systems ship only `traceroute -6`; the post already includes that alternative. RFC 4443 also requires ICMPv6 error-message rate limiting, so incomplete traceroute output can still occur on otherwise functional paths.
