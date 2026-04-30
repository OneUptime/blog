# Validation Summary: How to Understand IPv4-Compatible IPv6 Addresses

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6 addressing
- IPv4-compatible IPv6 addresses
- IPv4-mapped IPv6 addresses
- IPv6 transition mechanisms
- Python `ipaddress`
- Linux `ip` command
- Wireshark display filters
- Cisco IOS 6to4 tunnel syntax

## Sources Consulted
- RFC 4291, Section 2.5.5.1 and 2.5.5.2: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 2893, Section 5 (automatic tunneling and IPv4-compatible addresses): https://www.rfc-editor.org/rfc/rfc2893.html
- RFC 2529, noting 6over4 does not require IPv4-compatible addresses: https://www.rfc-editor.org/rfc/rfc2529
- RFC 4213, noting automatic tunneling and IPv4-compatible addresses were removed from the base transition mechanisms: https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 3056 (6to4): https://www.rfc-editor.org/rfc/rfc3056
- RFC 5214 (ISATAP): https://www.rfc-editor.org/rfc/rfc5214
- RFC 6146 (stateful NAT64): https://www.rfc-editor.org/info/rfc6146
- RFC 4038 (IPv4-mapped IPv6 addresses in dual-stack application behavior): https://www.rfc-editor.org/rfc/rfc4038
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Wireshark display filter reference and filter syntax: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark filter man page: https://www.wireshark.org/docs/man-pages/wireshark-filter
- Cisco IOS IPv6 command reference for `tunnel mode ipv6ip 6to4`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s6.html
- Local `ip address help` output from the installed `iproute2` version

## Issues Found
- The post incorrectly said IPv4-compatible addresses were designed for 6over4 (RFC 2529). I corrected this to RFC 2893 automatic tunneling, because RFC 2529 explicitly says 6over4 does not require IPv4-compatible IPv6 addresses.
- The examples used `192.168.1.1` for IPv4-compatible addresses. I changed them to `192.0.2.1` because RFC 4291 states IPv4-compatible addresses were intended to embed a globally unique IPv4 unicast address, so an RFC 1918 private address was a poor technical example.
- The Python example comment was too version-specific (`Python 3.9+`) without need. I simplified it to the current documented behavior: `::w.x.y.z` is treated as a normal IPv6 address, and only `::ffff/96` sets `ipv4_mapped`.
- The ISATAP description was too narrow. I clarified that ISATAP interface identifiers can appear as `::0:5efe:w.x.y.z` or `::200:5efe:w.x.y.z`, depending on whether the embedded IPv4 address is treated as locally or globally unique.
- The Wireshark filter example was inaccurate. I replaced it with a valid display-filter expression that matches addresses numerically in the deprecated `::/96` range while excluding `::` and `::1`.
- The `ip -6 addr show | grep "^0:0:0:0:0:0:"` example would not match normal `ip` output. I replaced it with `ip -6 addr show to ::/96`, which is valid with the current `ip` command syntax.
- The legacy Cisco 6to4 snippet used an implausible `/128` tunnel address and omitted the tunnel source. I corrected it to a Cisco-style 6to4 example with `no ip address`, a `/64` 6to4 address, and an explicit tunnel source.
- The section title and NAT64 wording implied that 6to4 and ISATAP were "modern" mechanisms. I adjusted that wording so the section is historically accurate while still noting NAT64/DNS64 as a current approach.

## Review Notes
- The post is now technically sound, but it covers several transition mechanisms with very different deployment status. 6to4 and ISATAP are useful here as historical context, not as current deployment guidance.
- The Python detection function is logically correct for distinguishing deprecated IPv4-compatible addresses from IPv4-mapped addresses, loopback, and unspecified addresses.
