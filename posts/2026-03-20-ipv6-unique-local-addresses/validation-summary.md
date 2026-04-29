# Validation Summary: How to Understand IPv6 Unique Local Addresses (fc00::/7)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Unique Local Addresses (ULA)
- Linux `iproute2`
- `radvd`
- RFC 4193
- RFC 4862

## Sources Consulted
- RFC 4193, "Unique Local IPv6 Unicast Addresses" - https://www.rfc-editor.org/rfc/rfc4193
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- IANA Number Resources overview - https://www.iana.org/ipaddress/ip-address.htm
- Upstream `radvd.conf(5)` source from the official `radvd` repository - https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.5.man
- Local CLI help for `ip -6 addr help`
- Local CLI help for `ip -6 route help`

## Issues Found
- The Global ID description said it made the prefix unique per organization. RFC 4193 only gives a very high probability of uniqueness, so I changed the wording to describe collisions as highly unlikely.
- The text said RFC 4193 defines the time-and-EUI-64 algorithm directly. RFC 4193 presents that as sample code for generating a pseudo-random Global ID, so I updated the wording to reflect that.
- The Python comment describing the `/48` formatting was inaccurate. I corrected the comment to match the actual `fdXX:XXXX:XXXX::/48` layout produced by the script.
- The Linux routing example added the entire `/48` as an on-link route on `eth0`, which is not generally correct for a single `/64` interface subnet. I changed it to a static route for a different ULA `/64` via a next-hop address on the local subnet.
- The ULA/GUA comparison table overstated ULA uniqueness and described GUA uniqueness too narrowly in terms of RIRs. I corrected the table to say ULA uniqueness is high probability and that GUA allocation is via ISP/RIR allocation.
- The IPv4 comparison section said each organization gets a unique `/48`. RFC 4193 ULAs are self-assigned, so I changed that wording to "can self-assign."
- The `radvd` snippet included a comment saying to never set `AdvRouterAddr` for ULA. Upstream `radvd.conf(5)` documents `AdvRouterAddr` as a Mobile IPv6 option, not a ULA-specific rule, so I removed the incorrect comment.
- The conclusion said the pseudo-random Global ID "ensures" uniqueness across organizations. I changed that to the RFC-accurate high-probability wording.

## Review Notes
- The Python example is syntactically valid and generates correctly formatted `fd00::/8`-based `/48` prefixes.
- The `ip -6 addr add` and `ip -6 addr show` commands are syntactically correct according to local `ip` CLI help.
- The `radvd` prefix example is valid for SLAAC on a `/64`; `AdvPreferredLifetime` and `AdvValidLifetime` values are also consistent with `radvd.conf(5)`.
