# Validation Summary: How to Test IPv6 Firewall Rules with Packet Crafting

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux `ip6tables`
- Nmap/Nping
- Scapy
- ICMPv6
- Neighbor Discovery
- IPv6 extension headers

## Sources Consulted
- `ip6tables` man page on the local system (`ip6tables` 1.8.10)
- hping3 Debian man page: https://manpages.debian.org/bookworm/hping3/hping3.8.en.html
- Nping Reference Guide: https://nmap.org/book/nping-man.html
- Nmap IPv6 scanning guide: https://nmap.org/book/port-scanning-ipv6.html
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy IPv6 API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- RFC 4443 (ICMPv6): https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861 (Neighbor Discovery for IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890 (ICMPv6 filtering recommendations): https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 5095 (Deprecation of Routing Header Type 0): https://www.rfc-editor.org/rfc/rfc5095
- RFC 7112 (IPv6 first-fragment header-chain requirements): https://www.rfc-editor.org/rfc/rfc7112
- RFC 7113 (RA-Guard implementation advice): https://www.rfc-editor.org/rfc/rfc7113
- RFC 8200 (IPv6 specification): https://www.rfc-editor.org/rfc/rfc8200
- RFC 8201 (IPv6 Path MTU Discovery): https://www.rfc-editor.org/rfc/rfc8201
- SI6 Networks IPv6 Toolkit overview: https://www.si6networks.com/research/tools/ipv6toolkit/
- `ra6` Debian man page: https://manpages.debian.org/unstable/ipv6toolkit/ra6.1.en.html
- `frag6` Debian man page: https://manpages.debian.org/bookworm/ipv6toolkit/frag6.1.en.html

## Issues Found
- The post used `hping3 -6` and `--icmpv6` examples, but the documented `hping3` CLI does not provide those IPv6 options. I replaced that section with `nping`, which has documented IPv6 support and packet-generation flags.
- Multiple sample addresses were invalid IPv6 literals, including `2001:db8::target` and `2001:db8:test::/64`. I replaced them with valid documentation-prefix addresses.
- The `ip6tables -L | wc -l` guidance incorrectly implied a fixed minimum line count proves IPv6 rules exist. I changed it to compare `-S` output counts and describe the result as a heuristic only.
- The Scapy TCP probe comment said an open port should return RST. I corrected it to SYN-ACK for open, RST for closed, and added handling for ICMPv6 unreachable responses from `REJECT` policies.
- The `ra6` example used a nonexistent `--hbh-opt` flag and an unsuitable global-unicast destination for RA testing. I updated it to the documented `-H` option and a link-local multicast destination appropriate for RA-Guard-style testing.
- The `frag6` example used nonexistent `--proto` and `--dport` flags. I replaced it with a Scapy `fragment6()` example that actually sends fragmented IPv6 TCP probes.
- The Routing Header Type 0 example built an incomplete header with no route list or `Segments Left` value. I changed it to craft an RH0 packet with `segleft=1` and an address list so it exercises the RFC 5095 behavior being discussed.
- The Packet Too Big section incorrectly crafted a bare ICMPv6 PTB toward the destination host, which does not match RFC 4443/RFC 8201 semantics for PMTUD testing. I replaced it with a packet-capture plus end-to-end PMTUD verification workflow.
- The test-case table overstated a few expectations. I narrowed NDP to local-link scope, changed denied TCP ports to "DROPPED or REJECTED", and scoped the RA Guard case to guarded access ports.
- The automation script did not use `-Pn`, so host discovery could prevent a port scan from running during firewall tests. I added `-Pn`, tightened the `grep`, and changed the closed-port expectation text to "Should not be open" to match what the script actually verifies.

## Review Notes
- The local system reports `ip6tables v1.8.10 (nf_tables)`, so these commands are valid, but many Linux distributions now prefer native `nft` rulesets. The post is still technically correct because `ip6tables` remains available as a front-end on many systems.
- Nping's official documentation notes that IPv6 support is available but currently experimental. The examples are valid, but readers should confirm behavior on their installed Nmap/Nping version.
