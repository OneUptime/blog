# Validation Summary: How to Use ICMPv6 Destination Unreachable Codes

## Status
validated

## Post Type
Reference

## Technologies Covered
- ICMPv6
- IPv6
- Linux `ip6tables`
- Linux routing and socket error handling
- Python `socket` and `errno`
- RPL source routing / projected routes

## Sources Consulted
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443.html
- IANA ICMPv6 Parameters registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- RFC 6554, "An IPv6 Routing Header for Source Routes with the Routing Protocol for Low-Power and Lossy Networks (RPL)": https://www.rfc-editor.org/rfc/rfc6554.html
- RFC 8883, "ICMPv6 Errors for Discarding Packets Due to Processing Limits": https://www.rfc-editor.org/rfc/rfc8883.html
- RFC 9914, "Root-Initiated Routing State in the Routing Protocol for Low-Power and Lossy Networks (RPL)": https://www.rfc-editor.org/rfc/rfc9914.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `errno` documentation: https://docs.python.org/3/library/errno.html
- Python `OSError` documentation: https://docs.python.org/3/library/exceptions.html#OSError
- Local `ip6tables -j REJECT --help` output from `ip6tables v1.8.10 (nf_tables)`
- Local `ip -6 route help` output

## Issues Found
- The post said there were eight Destination Unreachable codes. I corrected this to the currently assigned set of codes 0 through 9 and added Codes 8 and 9, which were assigned by later RFCs.
- Code 7 was described as a generic/segment-routing error. I corrected it to the RPL Source Routing Header case defined by RFC 6554.
- The Code 6 example used `ip -6 route add blackhole`, which silently drops traffic and does not represent a reject-route indication. I replaced the example with Linux's explicit `icmp6-reject-route` reject type.
- The Python section implied a one-to-one, transport-independent mapping from ICMPv6 codes to socket errors and used a TCP `connect()` example that conflated ICMPv6 Port Unreachable with TCP closed-port behavior. I rewrote it as a Linux-oriented diagnostic helper and corrected the common errno mappings.
- The `ip6tables` reject values `icmp6-addr-unreach` and `icmp6-port-unreach` did not match the documented names for the installed tool. I corrected them to `icmp6-addr-unreachable` and `icmp6-port-unreachable`.
- The DROP example used an invalid IPv6 prefix literal, `2001:db8:suspect::/48`. I replaced it with a valid documentation prefix.
- The NDP explanation referred specifically to a destination MAC address. I corrected that to the more accurate link-layer address terminology.

## Review Notes
- The examples are valid for the installed `ip6tables` frontend on this host, which is `ip6tables v1.8.10 (nf_tables)`. Some deployments may prefer native `nftables`, but that does not make the current examples incorrect.
- Linux errno reporting for ICMPv6 is implementation-specific and transport-specific. Exact code identification still often requires packet capture.
- Codes 7 and 9 are specialized RPL cases and are uncommon on general-purpose IPv6 networks.
