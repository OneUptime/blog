# Validation Summary: How to Understand the 6to4 Address Space (2002::/16) - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- 6to4
- RFC 3056
- RFC 6343
- RFC 7526
- RFC 3964
- Python `ipaddress`
- Linux `ip` / `ip6tables`

## Sources Consulted
- RFC 3056, *Connection of IPv6 Domains via IPv4 Clouds*: https://www.rfc-editor.org/rfc/rfc3056
- RFC 6343, *Advisory Guidelines for 6to4 Deployment*: https://datatracker.ietf.org/doc/html/rfc6343
- RFC 7526, *Deprecating the Anycast Prefix for 6to4 Relay Routers*: https://www.rfc-editor.org/rfc/rfc7526.html
- RFC 3964, *Security Considerations for 6to4*: https://www.rfc-editor.org/rfc/rfc3964
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Local `ip tunnel help` output from `iproute2`
- Local `ip6tables -h` output from `ip6tables v1.8.10 (nf_tables)`

## Issues Found
- The introduction said `2002::/16` encodes a host's public IPv4 address. I changed this to a site's public IPv4 address in the `/48` prefix, because RFC 3056 defines the 6to4 site prefix as `2002:V4ADDR::/48`.
- The post implied that the `2002::/16` prefix itself is deprecated. I changed the section heading and conclusion to reflect the RFC position more accurately: RFC 7526 deprecates the 6to4 relay anycast address `192.88.99.1` in `192.88.99.0/24`, not the `2002::/16` IPv6 prefix itself.
- The relay bullet used `192.88.99.0/24` as the relay identifier. I corrected this to the actual anycast relay address `192.88.99.1`, while keeping the enclosing prefix for context.
- The security bullet was too loosely phrased. I replaced it with spoofing and denial-of-service risks, which are explicitly covered by RFC 3964.
- The Linux check command used `ip -6 tunnel show`, which is for IPv6 tunnel types and does not list `sit`/6to4 tunnels. I corrected it to `ip tunnel show | grep -E '6to4|sit'`.
- The deletion comment said the example command removed any 6to4 tunnel interface. I narrowed the wording to match what the command actually does: it deletes an interface named `tun6to4` if present.
- I removed two unused intermediate variables from the Python snippet so the example matches the actual computation being demonstrated.

## Review Notes
- The example uses `192.0.2.1`, which is appropriate for documentation. In real deployments, RFC 3056 requires a globally unique non-RFC1918 IPv4 address for 6to4.
- The Python output `2002:c000:201::/48` is the compressed form of `2002:c000:0201::/48`; both represent the same prefix.
- The `ip6tables` commands are syntactically valid on current systems that provide the compatibility frontend, although some modern Linux deployments prefer `nft` operationally.
