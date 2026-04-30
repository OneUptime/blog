# Validation Summary: How to Handle IPv6 Migration for Third-Party Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Dual-stack networking
- DNS AAAA records
- DNS64
- NAT64
- Jool
- HAProxy
- Python
- HTTPX
- Third-party SaaS/API integration

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3.11/library/socket.html
- dnspython resolver documentation: https://dnspython.readthedocs.io/en/stable/resolver.html
- dnspython exceptions documentation: https://dnspython.readthedocs.io/en/2.7/exceptions.html
- HTTPX transports documentation: https://www.python-httpx.org/advanced/transports/
- HTTPX API documentation: https://www.python-httpx.org/api/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- Jool Stateful NAT64 run guide: https://www.jool.mx/en/run-nat64.html
- Jool single-interface NAT64 guide: https://www.jool.mx/en/single-interface.html
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://datatracker.ietf.org/doc/html/rfc6052
- RFC 6147, DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers: https://datatracker.ietf.org/doc/html/rfc6147
- RFC 8305, Happy Eyeballs Version 2: Better Connectivity Using Concurrency: https://datatracker.ietf.org/doc/html/rfc8305

## Issues Found
- The inventory script claimed to test HTTP reachability over IPv6, but `requests.get()` to a hostname does not force an IPv6 connection. I replaced it with an explicit `AF_INET6` TCP/443 connectivity check using Python sockets and updated the field/output names to match what the code actually validates.
- The direct IPv6 `httpx` example was not valid Python as written because it used top-level `async with` and an invalid placeholder address (`2001:db8::app`). I replaced it with a valid `httpx.Client` example using `HTTPTransport(local_address=...)` and a syntactically valid documentation-prefix IPv6 address.
- The outbound proxy section mixed product names and behavior: the block was labeled as Nginx even though the snippet was HAProxy, and the comments described it as a forward proxy rather than a relay to an existing egress proxy. I corrected the code fence, comments, and surrounding text so the example matches what the HAProxy config actually does.
- The NAT64 section routed `64:ff9b::/96` to `lo`, which is not the documented Jool pattern for IPv6 clients reaching a translator. I updated it to the Jool-documented model: enable forwarding on the NAT64 gateway, load the `jool` module, create the instance, and route the NAT64 prefix to the translator.
- The DNS64/NAT64 explanation overstated how translation works by implying generic transparent outbound connectivity. I narrowed the wording to DNS-based outbound calls and clarified that DNS64 synthesizes AAAA records from A records when no real AAAA exists, with an RFC 6052-compatible example address.

## Review Notes
- Happy Eyeballs behavior can hide broken IPv6 paths while IPv4 continues to work, so AAAA presence alone is not sufficient validation.
- NAT64 plus DNS64 is the right fit for hostname-based outbound access to IPv4-only services; applications that depend on IPv4 literals or protocol-specific embedded addresses may need additional handling.
