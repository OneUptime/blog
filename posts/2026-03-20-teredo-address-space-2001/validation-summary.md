# Validation Summary: How to Understand the TEREDO Address Space (2001::/32)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6
- Teredo tunneling
- RFC 4380 / 2001::/32 addressing
- Python `ipaddress`, `socket`, and `struct`
- Linux `iptables`, `ip6tables`, and `systemctl`
- Windows `netsh`
- Miredo

## Sources Consulted
- RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) - https://datatracker.ietf.org/doc/html/rfc4380
- RFC 5991: Teredo Security Updates - https://datatracker.ietf.org/doc/html/rfc5991
- RFC 7123: Security Implications of IPv6 on IPv4 Networks - https://datatracker.ietf.org/doc/html/rfc7123
- RFC 5737: IPv4 Address Blocks Reserved for Documentation - https://datatracker.ietf.org/doc/html/rfc5737
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Microsoft Learn: Teredo Addresses - https://learn.microsoft.com/en-us/windows/win32/teredo/teredo-addresses
- Microsoft Learn: Required Firewall Exceptions for Teredo - https://learn.microsoft.com/en-us/windows/win32/teredo/required-firewall-exceptions-for-teredo
- Microsoft Learn: netsh interface commands - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Python `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- Python `struct` documentation - https://docs.python.org/3/library/struct.html
- Local CLI help for `iptables`, `ip6tables`, and `systemctl`

## Issues Found
- The worked Teredo address omitted the 16-bit flags field. As written, `0x63bf` was decoded as flags and `0x9c40` decoded as the complemented UDP port, producing client port `25535` instead of `40000`. Added an explicit `Flags: 0x0000` line and changed the sample address to `2001:0:4136:e378:0:63bf:3fff:fd9b`.
- The example used `192.168.1.100` as the encoded client address, but Teredo encodes the mapped external IPv4 address. Changed the example to the documentation address `192.0.2.100` and updated the complement to `0x3FFFFD9B`.
- The example asserted that `65.54.227.120` equals `teredo.ipv6.microsoft.com`. Because Teredo server DNS mappings are time-varying and the hostname did not resolve during validation, removed the equality claim and kept the IP as an example server address.

## Review Notes
- The Python parsing and filtering snippets were run successfully with Python 3.12.3 after the corrections.
- The firewall commands are syntactically valid. RFC 7123 notes that blocking UDP destination port 3544 prevents normal Teredo initialization, but non-standard Teredo servers or deeper payload inspection may require stronger controls.
- RFC 5991 updates RFC 4380 by randomizing parts of the flags field. The post's all-zero flags value is acceptable for a simple decoding example, but production Teredo clients should follow the updated flag behavior.
