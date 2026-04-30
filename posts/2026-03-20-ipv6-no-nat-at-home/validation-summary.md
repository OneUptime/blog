# Validation Summary: How to Understand Why IPv6 Doesn't Need NAT at Home

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and home-network prefix delegation
- IPv4 NAT and IPv6 firewall behavior
- Residential IPv6 customer-edge routing
- Linux `sysctl` IPv6 privacy-address settings
- NAT66 / IPv6-to-IPv6 translation discussion

## Sources Consulted
- RFC 8200, *Internet Protocol, Version 6 (IPv6) Specification*: https://www.rfc-editor.org/rfc/rfc8200
- RFC 3849, *IPv6 Address Prefix Reserved for Documentation*: https://www.rfc-editor.org/rfc/rfc3849
- RFC 5737, *IPv4 Address Blocks Reserved for Documentation*: https://www.rfc-editor.org/rfc/rfc5737
- RFC 4864, *Local Network Protection for IPv6*: https://www.rfc-editor.org/rfc/rfc4864
- RFC 6092, *Recommended Simple Security Capabilities in Customer Premises Equipment (CPE) for Providing Residential IPv6 Internet Service*: https://www.rfc-editor.org/rfc/rfc6092
- RFC 8981, *Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6*: https://www.rfc-editor.org/rfc/rfc8981
- RFC 5902, *IAB Thoughts on IPv6 Network Address Translation*: https://www.rfc-editor.org/rfc/rfc5902
- RFC 2993, *Architectural Implications of NAT*: https://www.rfc-editor.org/rfc/rfc2993
- Linux kernel documentation, *IP Sysctl*: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The IPv6 example used `2001:db8:home::/56` and related host addresses, which are syntactically invalid because `home` is not valid hexadecimal in an IPv6 literal. These were replaced with valid documentation addresses under `2001:db8::/32` per RFC 3849.
- The sentence saying home devices are "directly reachable from the internet" overstated IPv6 reachability. It was corrected to say devices can have globally routable addresses while inbound reachability still depends on router firewall policy.
- The security comparison overstated NAT as if it inherently provided security equivalent to an IPv6 firewall. It was tightened to reflect RFC 4864 and RFC 6092: typical home NAT behavior can incidentally block unsolicited inbound traffic, while IPv6 relies on explicit stateful filtering.
- The benefits section overstated protocol and performance behavior. "Work seamlessly" was narrowed to removal of NAT traversal requirements, and the performance note was corrected to distinguish removal of translation state from the still-common use of stateful firewalling on home gateways.
- The privacy section cited RFC 4941 as current even though it was obsoleted by RFC 8981, and its wording was tightened to describe the RFC-backed privacy concern more precisely. The text was updated accordingly.
- The Linux command example used `eth0`, which is not a reliable modern interface name, and its comment implied only one enabled value. It was updated to `net.ipv6.conf.all.use_tempaddr` with the kernel-documented value meanings (`0`, `1`, and `2 or higher`).

## Review Notes
- The post now accurately describes the common residential IPv6 model: globally addressed devices behind a stateful CPE firewall rather than behind address translation.
- The `/56` to `/64` home-network example is reasonable, but actual delegated prefix sizes vary by ISP and deployment.
