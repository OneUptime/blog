# Validation Summary: How to Assign IPv4 Addresses to GRE Tunnel Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux GRE tunnel interfaces
- `iproute2` address management with `ip addr`
- `iproute2` routing with `ip route`
- `iproute2` tunnel management with `ip tunnel`
- IPv4 point-to-point addressing with `/30`, `/31`, and `/32` peer routes
- RFC 3021 `/31` addressing

## Sources Consulted
- `ip-address(8)` man page: https://www.man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` man page: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-tunnel(8)` man page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links": https://www.rfc-editor.org/rfc/rfc3021

## Issues Found
- The `/32 with a Peer` example did not explicitly encode the `/32` on the peer address. In `ip-address(8)`, the prefix is associated with the `peer` value for point-to-point addressing, and the local address cannot carry a prefix when `peer` is used. I updated the commands to `peer 172.16.0.2/32` and `peer 172.16.0.1/32` so the example matches the section heading and the documented syntax unambiguously.

## Review Notes
- The post is technically correct after the `/32` peer-route clarification.
- The route examples using `ip route add ... via <far-end-tunnel-ip>` are valid because Linux automatically creates the connected prefix route, or the peer host route in the `/32` case, when the tunnel address is added.
- The `/31` examples are standards-compliant for point-to-point links per RFC 3021. As with any `/31` deployment, both tunnel endpoints must support RFC 3021 semantics.
- The address-assignment examples assume the GRE tunnel interface already exists; that matches the scope of this post, which is about endpoint addressing rather than tunnel creation.
