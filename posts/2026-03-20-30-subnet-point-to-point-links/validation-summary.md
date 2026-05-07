# Validation Summary: How to Understand the /30 Subnet for Point-to-Point Links

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- Point-to-point WAN links
- RFC 3021 `/31` addressing
- Python `ipaddress`
- Linux `iproute2`

## Sources Consulted
- Python Standard Library, `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- RFC 3021, `Using 31-Bit Prefixes on IPv4 Point-to-Point Links`: https://datatracker.ietf.org/doc/html/rfc3021
- RFC 4632, `Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan`: https://datatracker.ietf.org/doc/rfc4632/
- Linux `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Local `ip address help` output from the installed `iproute2` CLI

## Issues Found
- The final takeaway said `/31` has "no broadcast." RFC 3021 is narrower than that: on point-to-point links, `/31` uses both addresses as host addresses and eliminates the separate network and directed-broadcast reservation for the link, but limited broadcast still exists. I updated that sentence to describe `/31` accurately without changing the post structure.

## Review Notes
- The Python examples were executed locally and produced the expected `/30` subnet counts and host allocations shown in the post.
- The Linux commands use valid `ip addr add ... dev ...` syntax. As usual, the example assumes `eth1` exists and the interface/link state permits end-to-end connectivity.
- RFC 3021 applies specifically to point-to-point links, and the post keeps `/31` scoped to that use case.
