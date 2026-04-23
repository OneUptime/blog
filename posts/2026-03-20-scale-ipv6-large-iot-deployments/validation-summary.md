# Validation Summary: How to Scale IPv6 for Large IoT Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 addressing and prefix hierarchy
- DHCPv6
- ISC Kea high availability and MySQL lease storage
- NetBox REST API and IPAM automation
- Linux NDP proxy and ndppd
- Prometheus static and file-based service discovery
- Python and shell scripting

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- ISC Kea DHCPv6 Server documentation: https://kea.readthedocs.io/en/stable/arm/dhcp6-srv.html
- ISC Kea High Availability Hooks documentation: https://kea.readthedocs.io/en/stable/arm/hooks.html
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox REST API filtering documentation: https://netbox.readthedocs.io/en/stable/reference/filtering/
- NetBox IPAM API source for available prefixes: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/api/views.py
- Prometheus configuration and file service discovery documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- iproute2 ip-neighbour manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- ndppd upstream documentation and sample config: https://github.com/DanielAdolfsson/ndppd

## Issues Found
- The prefix hierarchy described an IPv6 /64 as supporting 65,536 devices. Changed this to describe the /64 as a 64-bit interface ID space, because a /64 contains 2^64 addresses and practical limits are driven by router/NDP/device behavior rather than address count.
- The Kea DHCPv6 HA example omitted required/current hook libraries for MySQL lease storage and HA lease synchronization. Added `libdhcp_mysql.so` and `libdhcp_lease_cmds.so`, noted the Control Agent or HA+MT listener requirement, added trailing slashes to peer URLs, and changed the example DHCPv6 subnet from /48 to /64.
- Several IPv6 examples used invalid literals such as `2001:db8:iot:...` and `::sensor1`. Replaced them with valid addresses under the RFC 3849 documentation prefix.
- The NetBox provisioning script claimed to allocate the next available /64 but posted a fixed prefix to `/ipam/prefixes/`. Updated it to use the parent prefix `available-prefixes` endpoint with `prefix_length: 64`, current Bearer token authentication, nested related-object references, request timeout, and error handling.
- The NDP proxy section implied NDP proxy is the primary cache-exhaustion fix. Adjusted the explanation to prefer routed L2 segmentation and cache tuning, with NDP proxy positioned for specific reachability-bridging cases.
- The ndppd example used invalid configuration shape (`route auto`). Replaced it with the upstream `proxy <interface> { rule <prefix> { iface <interface> } }` structure.
- The Prometheus target examples used invalid IPv6 addresses. Replaced them with bracketed valid IPv6 host:port targets.
- The NetBox-to-Prometheus target generation script used a single `limit=10000` request, which can miss results because NetBox enforces pagination and a default maximum page size. Replaced it with a paginated generator that follows the `next` URL and emits Prometheus file service discovery JSON.

## Review Notes
The Python snippets were syntax-checked locally, and the Kea configuration was parsed as JSON after stripping Kea-style comments. `promtool` was not installed locally, so Prometheus configuration was reviewed against official documentation rather than validated with the CLI. The NetBox examples assume the referenced parent prefix, tenant, VLAN objects, and `iot` tag already exist.
