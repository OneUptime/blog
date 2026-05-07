# Validation Summary: How to Understand the 6to4 Address Space (2002::/16)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- 6to4
- `2002::/16`
- RFC 3056
- RFC 6343
- RFC 7526
- Python `ipaddress`
- Linux networking CLI (`ip`, `iptables`, `ip6tables`)
- macOS `networksetup`

## Sources Consulted
- RFC 3056, *Connection of IPv6 Domains via IPv4 Clouds*: https://www.rfc-editor.org/rfc/rfc3056
- RFC 6343, *Advisory Guidelines for 6to4 Deployment*: https://www.rfc-editor.org/rfc/rfc6343.html
- RFC 7526, *Deprecating the Anycast Prefix for 6to4 Relay Routers*: https://www.rfc-editor.org/rfc/rfc7526.html
- Python Standard Library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Apple Support, *Set up a 6to4 network port on Mac*: https://support.apple.com/en-ca/guide/mac-help/mchlp2500/mac
- Apple Support, *About networksetup in Remote Desktop*: https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- Local CLI help output: `ip tunnel help`
- Local CLI help output: `iptables --help`
- Local CLI help output: `ip6tables --help`

## Issues Found
- The introduction said “bits 2-5 of the /48 prefix,” which was incorrect. I changed it to “the next 32 bits of the /48 prefix” to match RFC 3056’s `2002:V4ADDR::/48` format.
- The example labeled `203.0.113.42` as “Public IPv4,” but that address is from TEST-NET-3 documentation space. I changed the label to “Example IPv4.”
- The Python docstring said the function accepted a “public IPv4 address,” but the code only performs encoding and does not validate global uniqueness. I changed the docstring to describe what the function actually does.
- The “Why 6to4 Should Be Disabled” section implied all 6to4 relay selection uses `192.88.99.1` and that RFC 7526 deprecated `2002::/16`. I corrected this to the anycast 6to4 variant and clarified that RFC 7526 deprecated `192.88.99.0/24`, not `2002::/16` itself.
- The NAT-related wording was too broad. I changed it to say that end-host 6to4 does not traverse NAT and that the 6to4 endpoint needs a globally unique IPv4 address.
- The macOS note suggested a targeted 6to4 `sysctl` disable path without a verified Apple source. I replaced it with Apple-supported guidance: `networksetup -setv6off` disables IPv6 on a service, and a configured 6to4 service should be removed in Network settings.
- The conclusion described 6to4 as “deprecated” in a way that conflated the mechanism with the deprecated anycast relay prefix. I reworded it to accurately attribute deprecation to the anycast relay prefix and unreliability to common anycast deployments.

## Review Notes
- The Python example is syntactically valid and produced the stated outputs when run locally.
- The Linux command syntax for `ip tunnel del`, `iptables -A`, and `ip6tables -A` is valid per local help output.
- RFC 3056 is explicit that 6to4 is for sites or hosts with a globally unique IPv4 address, so “globally unique” is the more precise term here.
- RFC 7526 explicitly says the basic unicast 6to4 mechanism and `2002::/16` are not deprecated; only the relay anycast prefix is.
