# Validation Summary: How to Calculate Broadcast Address from an IP and Subnet Mask

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP subnetting
- Broadcast addressing
- Python `socket` module
- Python `struct` module
- Python `ipaddress` module

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `struct` documentation: https://docs.python.org/3/library/struct.html
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://www.rfc-editor.org/rfc/rfc3021

## Issues Found
- The takeaway "The last address of any subnet is always the broadcast" was too broad. RFC 3021 defines `/31` point-to-point links as an exception where the two addresses are interpreted as host addresses, so I changed the wording to "For conventional IPv4 subnets, the last address is the broadcast."
- The takeaway "The broadcast address cannot be assigned to any host" was also too broad for the same RFC 3021 reason, so I changed it to "For conventional IPv4 subnets, the broadcast address cannot be assigned to a host."

## Review Notes
- The Python examples were validated locally and produced the documented broadcast addresses.
- The `ipaddress` module documentation confirms that `IPv4Interface(...).network.broadcast_address` is a valid way to obtain the broadcast address for the containing IPv4 network.
- Python documents that `socket.inet_aton()` accepts some non-canonical IPv4 string forms depending on the underlying C implementation, but the post’s examples use standard dotted-quad input and are correct as written.
