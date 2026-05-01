# Validation Summary: How to Understand Dual-Stack Operational Complexity

## Status
validated

## Post Type
Guide / operational reference

## Technologies Covered
- IPv4
- IPv6
- Dual-stack network operations
- DNS (`A`, `AAAA`, `PTR`, `ip6.arpa`)
- BGP prefix filtering
- ACLs and firewall policy
- SNMP (`IP-MIB`, `IPV6-MIB`)
- NetFlow/IPFIX and `nfdump`
- Linux network troubleshooting tools (`ping`, `traceroute`, `ip`, `tcpdump`, `nmap`)

## Sources Consulted
- RFC 6724: Default Address Selection for Internet Protocol Version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc6724
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- IANA IPv4 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 3596: DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596.html
- RFC 4443: Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- BIND 9 `dig` man page: https://isc-projects.gitlab-pages.isc.org/bind9/manpages.html
- Nmap target specification and IPv6 scanning docs: https://nmap.org/book/man-target-specification.html and https://nmap.org/book/port-scanning-ipv6.html
- Net-SNMP `snmpwalk` man page: https://www.net-snmp.org/docs/man/snmpwalk.html
- Net-SNMP `IP-MIB` and `IPV6-MIB` object references: https://www.net-snmp.org/docs/mibs/ip.html and https://www.net-snmp.org/docs/mibs/ipv6MIB.html
- `nfdump` man page: https://manpages.debian.org/testing/nfdump/nfdump.1.en.html
- `pcap-filter(7)` and `traceroute(8)` Linux manual pages: https://man7.org/linux/man-pages/man7/pcap-filter.7.html and https://man7.org/linux/man-pages/man8/traceroute.8.html
- Local command help/output checked for `ping -6`, `ip -6 route`, and `tcpdump` filter compilation

## Issues Found
- The RFC 6724 sentence implied IPv6 is always preferred. I changed it to "often selected first" because RFC 6724 address selection depends on policy and available addresses, not an unconditional IPv6-first rule.
- The ACL table used inaccurate prefix examples. I replaced `::/8` with concrete IPv6 special-use examples, normalized the IPv4 loopback notation to `127.0.0.0/8`, and renamed the row to "Special-use / bogon prefixes" so it does not imply a single universal bogon list.
- The DNS checklist said internal resolvers must "forward both record types." I changed this to "answer or forward both A and AAAA queries" because standard resolvers operate on query handling, not separate per-record-type forwarding configuration.
- The SNMP example pointed at the older `IPV6-MIB` subtree. I updated it to the current `IP-MIB` per-family statistics subtree and noted that some older agents still expose `IPV6-MIB`.
- The troubleshooting table used an incorrect Linux IPv6 route command example (`netstat -rn -f inet6`). I replaced it with `ip -6 route` and also updated the ping/traceroute examples to the current documented `-6` forms.

## Review Notes
- The `dig`, `nfdump`, `tcpdump`, and `nmap` examples are syntactically valid against current documentation.
- `traceroute6` remains a valid alias on systems that ship it, but `traceroute -6` is the clearer documented form.
- The remaining BGP, ACL, and DNS examples are vendor-neutral operational illustrations rather than device-specific copy-paste configurations.
