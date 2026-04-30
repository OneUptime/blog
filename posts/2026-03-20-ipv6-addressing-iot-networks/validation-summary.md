# Validation Summary: How to Plan IPv6 Addressing for IoT Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IoT networking
- 6LoWPAN
- Thread
- Linux `ip6tables`
- DHCPv6
- `dnsmasq`
- Router Advertisements (`radvd`)
- Python `ipaddress`

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862.html
- RFC 4944, Transmission of IPv6 Packets over IEEE 802.15.4 Networks: https://www.rfc-editor.org/rfc/rfc4944.html
- RFC 6282, Compression Format for IPv6 Datagrams over IEEE 802.15.4-Based Networks: https://www.rfc-editor.org/rfc/rfc6282.html
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://www.rfc-editor.org/rfc/rfc8064.html
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Upstream `dnsmasq` man page: https://dnsmasq.org/docs/dnsmasq-man.html
- netfilter `iptables` project documentation: https://www.iptables.org/projects/iptables/index.html
- OpenThread official documentation: https://openthread.io/
- radvd official repository: https://github.com/radvd-project/radvd

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:site::/48`. IPv6 hextets may only contain hexadecimal digits, so I replaced them with a valid documentation prefix, `2001:db8:1000::/48`, throughout the post.
- The 6LoWPAN section implied Zigbee uses 6LoWPAN/IPv6 directly and treated EUI-64-derived IIDs and `/64` usage as absolute behavior. I corrected this to Thread and similar IP-based 802.15.4 networks, clarified that Modified EUI-64 IIDs can be used, and reworded the `/64` statement as the typical SLAAC design on a 6LoWPAN link.
- The Python example built IPv6 addresses by string concatenation, which produced an invalid address form and also used an invalid subnet literal. I rewrote the function to validate the EUI-64 length, require a `/64` prefix, and construct the final address with Python's `ipaddress` module.
- The firewall example allowed management and cloud sessions to start but lacked an explicit stateful return-traffic rule, so replies could be dropped by the final catch-all rule. I added an `ESTABLISHED,RELATED` rule, separated the user and management prefixes, and corrected the final comment to match the actual rule behavior.
- The `dnsmasq` DHCPv6 options omitted the required square brackets around IPv6 addresses in `option6:` values. I added brackets and clarified that the Router Advertisement example is `radvd` configuration.

## Review Notes
- `ip6tables` is still valid and part of the `iptables` package, but modern Linux distributions commonly use the nftables backend or `nft` directly.
- RFC 8064 recommends stable, opaque interface identifiers as the default for SLAAC on general-purpose hosts, so EUI-64-derived IIDs should be used intentionally rather than assumed to be the default everywhere.
