# Validation Summary: How to Understand the AMT Address Space (2001:3::/32) - 200130

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- IPv6
- Automatic Multicast Tunneling (AMT)
- RFC 7450
- Python `ipaddress`
- Linux `iproute2` (`ip link`)
- `ip6tables` / Netfilter

## Sources Consulted
- RFC 7450, *Automatic Multicast Tunneling*: https://www.rfc-editor.org/rfc/rfc7450.html
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Local CLI help output from `ip link help amt`
- Local CLI help output from `ip6tables -j LOG -h`
- Local execution of the Python example with `python3`

## Issues Found
- The post described `2001:3::/32` as a pseudo-interface or tunnel addressing scheme with an embedded relay IPv4 address. RFC 7450 defines `2001:3::/32` as the IPv6 AMT relay-discovery anycast prefix for public AMT relays, with `2001:3::1` as the Relay Discovery Address and the remaining addresses in the prefix reserved for future use. I updated the introduction, diagram, address-format section, Python example comments, and conclusion to match the RFC.
- The Linux setup section used `amtrelayd` package and config-file examples that could not be validated against current Linux AMT tooling. Current documented Linux support is exposed through `ip link ... type amt`. I replaced that section with a validated `ip link add ... type amt` example and an `ip -d link show` verification command.
- The filtering section implied that AMT addresses should not be externally routed by default. The IANA registry marks `2001:3::/32` as source-valid, destination-valid, forwardable, and globally reachable. I changed the text to present the `ip6tables` rules as an example boundary policy for networks that do not use public AMT relay discovery on that path.

## Review Notes
- The Python helper correctly checks whether an address is inside the reserved `2001:3::/32` prefix. That is broader than checking whether an address is the currently defined public Relay Discovery Address `2001:3::1`, so the surrounding text now makes that distinction explicit.
- The `ip6tables` commands are syntactically valid on current systems, including `ip6tables v1.8.10 (nf_tables)`, but some environments may prefer native `nft` rulesets operationally.
