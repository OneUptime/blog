# Validation Summary: How to Understand the IPv6 Routing Header

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 extension headers
- IPv6 Routing Header types (RH0, Type 2, RPL RH3, SRH Type 4)
- Mobile IPv6
- Segment Routing over IPv6 (SRv6)
- Linux IPv6 sysctl configuration
- Python `socket` and `struct`

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200
- RFC 5095: Deprecation of Type 0 Routing Headers in IPv6 - https://datatracker.ietf.org/doc/html/rfc5095
- RFC 6275: Mobility Support in IPv6 - https://datatracker.ietf.org/doc/html/rfc6275
- RFC 6554: An IPv6 Routing Header for Source Routes with the Routing Protocol for Low-Power and Lossy Networks (RPL) - https://datatracker.ietf.org/doc/html/rfc6554
- RFC 8754: IPv6 Segment Routing Header (SRH) - https://www.rfc-editor.org/rfc/rfc8754
- IANA IPv6 Parameters registry - https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel seg6 sysctl documentation - https://docs.kernel.org/networking/seg6-sysctl.html
- Python `socket` documentation - https://docs.python.org/3.11/library/socket.html
- Python `struct` documentation - https://docs.python.org/3.11/library/struct.html

## Issues Found
- The introduction said the packet originator can specify the "exact path" and implied Type 2 was the only active routing header type. I changed this to the RFC 8200 model of specifying intermediate nodes and updated the text to reference active types such as Type 2, Type 3, and Type 4.
- The RH0/Linux section claimed all routers must drop RH0 and described `accept_source_route` values incorrectly. I replaced that with RFC 5095's actual RH0 handling and Linux's documented `accept_source_route` semantics: `0` accepts only Routing Header Type 2, while negative values disable routing-header acceptance.
- The Type 2 section incorrectly described home-agent forwarding. I corrected it to the RFC 6275 route-optimization behavior where a correspondent node sends to the care-of address and the mobile node recovers the home address from the routing header.
- The Python example used an invalid IPv6 literal, `2001:db8:home::1`, which raises `OSError` with `socket.inet_pton()`. I replaced it with a valid documentation-prefix IPv6 address.
- The SRH section labeled prose as JavaScript, described a nonexistent "Current Segment Index" field, and used a misleading Linux inspection command. I changed the block to text, replaced the field description with `Last Entry` and `Segments Left`, and updated the command to query `net.ipv6.conf.all.seg6_enabled`.
- The routing-type table treated Nimrod as "Never deployed" without reflecting its current registry state. I updated it to "Deprecated" and relabeled the section as common routing header types so it does not imply an exhaustive list.

## Review Notes
- The current IANA routing-type registry also includes CRH-16 and CRH-32 (types 5 and 6) from RFC 9631. The post now frames its table as common routing header types rather than a complete registry dump.
