# Validation Summary: How to Train Your Team on IPv6 Fundamentals

## Status
validated

## Post Type
Technical training guide

## Technologies Covered
- IPv6 addressing, address compression, address types, and Unique Local Addresses
- SLAAC, Router Advertisements, DHCPv6, NDP, and ICMPv6
- IPv6 routing concepts, OSPFv3, and multiprotocol BGP
- IPv6 transition mechanisms including dual-stack, NAT64/DNS64, and legacy 6to4/Teredo
- Linux IPv6 troubleshooting commands: ip, ping, traceroute, ss, dig, nslookup, and curl
- Docker Compose IPv6 networking
- NGINX container used as a lab web server

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4193: Unique Local IPv6 Unicast Addresses - https://datatracker.ietf.org/doc/html/rfc4193
- RFC 4861: Neighbor Discovery for IP version 6 - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 5340: OSPF for IPv6 - https://datatracker.ietf.org/doc/html/rfc5340
- RFC 5952: A Recommendation for IPv6 Address Text Representation - https://www.rfc-editor.org/rfc/rfc5952
- RFC 4760: Multiprotocol Extensions for BGP-4 - https://datatracker.ietf.org/doc/html/rfc4760
- RFC 8200: Internet Protocol, Version 6 Specification - https://datatracker.ietf.org/doc/html/rfc8200
- RFC 8305: Happy Eyeballs Version 2 - https://www.rfc-editor.org/rfc/rfc8305
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 - https://datatracker.ietf.org/doc/html/rfc8415
- RFC 3986: URI Generic Syntax - https://datatracker.ietf.org/doc/html/rfc3986
- RFC 6874: Zone Identifiers in IPv6 Address Literals - https://datatracker.ietf.org/doc/html/rfc6874
- RFC 7526: Deprecating the Anycast Prefix for 6to4 Relay Routers - https://datatracker.ietf.org/doc/html/rfc7526
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose service-level networks and ipv6_address - https://docs.docker.com/reference/compose-file/services/
- Official NGINX Docker entrypoint IPv6 script - https://raw.githubusercontent.com/nginx/docker-nginx/master/entrypoint/10-listen-on-ipv6-by-default.sh
- Linux man pages and local CLI help for iproute2, iputils ping, traceroute, ss, curl, dig, and nslookup.

## Issues Found
- The Docker lab used `fd00:lab::/64`, `fd00:lab::1`, and `fd00:lab::10`, which are invalid IPv6 literals because IPv6 hextets must use hexadecimal digits. Changed them to `fd00:10ab::/64`, `fd00:10ab::1`, and `fd00:10ab::10`.
- The quick reference used `ping6` and `traceroute6`. Updated the commands to the current documented forms `ping -6` and `traceroute -6`, and added the `traceroute` package to the Ubuntu lab containers so the traceroute example is available.
- The HTTP IPv6 literal example used `http://[2001:db8::1]:8080/health`, which is from the documentation prefix and did not correspond to the lab web server or a defined health endpoint. Changed it to `http://[fd00:10ab::10]/` to match the NGINX lab service.
- The service listener check used a grep pattern against `ss` output. Replaced it with `ss -6 -tlnp`, which directly asks ss to show IPv6 TCP listening sockets.
- The curriculum described "RA flags (M/O/A)" as if all three were the same kind of Router Advertisement flag. Clarified this as RA M/O flags and the Prefix Information A flag.
- The transition mechanisms module listed 6to4/Teredo without context. Marked them as legacy to reflect the current operational status, including 6to4 anycast deprecation.
- The misconceptions table had overly broad claims about NAT, `::`, IPv6 optionality, speed, and misconfiguration. Reworded those entries to avoid incorrect absolutes while preserving the author's intent.

## Review Notes
Docker is not installed in this workspace, so I could not run `docker compose up` end-to-end. The Compose syntax and IPv6 fields were validated against Docker documentation, and the corrected IPv6 literals were checked with Python's `ipaddress` parser. Public IPv6 examples such as Google DNS and `ipv6.google.com` still require the reader's host and network to have working IPv6 connectivity.
