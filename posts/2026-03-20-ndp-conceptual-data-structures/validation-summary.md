# Validation Summary: How to Understand NDP Conceptual Data Structures

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- RFC 4861 conceptual data structures (Neighbor Cache, Destination Cache, Prefix List, Default Router List)
- Linux iproute2 (`ip -6 neigh`, `ip -6 route`)
- ICMPv6 (Neighbor Solicitation/Advertisement, Router Advertisement, Redirect, Packet Too Big)
- SLAAC (Stateless Address Autoconfiguration)
- Path MTU Discovery (PMTUD)
- Python 3.10+ (type hints with `str | None`, `ipaddress` module)

## Sources Consulted
- RFC 4861 - Neighbor Discovery for IP version 6 (IPv6), Section 5.1 "Conceptual Data Structures" and Section 7.3.2 "Neighbor Cache Entry States" (https://datatracker.ietf.org/doc/html/rfc4861)
- RFC 4862 - IPv6 Stateless Address Autoconfiguration (https://datatracker.ietf.org/doc/html/rfc4862)
- RFC 4191 - Default Router Preferences and More-Specific Routes (https://datatracker.ietf.org/doc/html/rfc4191)
- RFC 8201 - Path MTU Discovery for IP version 6 (https://datatracker.ietf.org/doc/html/rfc8201)
- iproute2 ip-route(8) and ip-neighbour(8) man pages
- Linux kernel source for `RTPROT_RA` (route protocol identifier for RA-installed routes)
- Python 3 `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html)

## Issues Found
- **Prefix List section used `proto kernel` instead of `proto ra` for RA-installed routes.** Modern Linux kernels (since iproute2/kernel introduced `RTPROT_RA = 9`) mark on-link routes installed from Router Advertisements with `proto ra`, not `proto kernel`. The `proto kernel` protocol is reserved for connected routes the kernel automatically adds for configured interface addresses (which do not normally have an `expires` field). The example route in the post showed `proto kernel ... expires 2591899sec`, which is internally inconsistent — only RA-derived routes have an expiry time.
  - Updated the data structures overview from `Linux: ip -6 route show (kernel proto routes)` to `Linux: ip -6 route show proto ra`.
  - Updated the Prefix List section command from `ip -6 route show | grep "proto kernel"` to `ip -6 route show proto ra`.
  - Updated the example route from `proto kernel` to `proto ra`.

## Review Notes
- The Python sample uses `str | None` PEP 604 union syntax, which requires Python 3.10+. This is reasonable for current code but worth noting for readers on older Python versions.
- The list of NUD states (`INCOMPLETE, REACHABLE, STALE, DELAY, PROBE, FAILED, PERMANENT`) correctly mixes RFC 4861 states (INCOMPLETE, REACHABLE, STALE, DELAY, PROBE) with Linux-specific additions (FAILED, PERMANENT) — this is appropriate since the surrounding context is `ip -6 neigh show` output. Linux also exposes NOARP and NONE, but these are less relevant in everyday usage.
- The mapping "Router Preference: High=low metric, Low=high metric" is consistent with RFC 4191 semantics and Linux's implementation (higher preference yields a numerically lower metric, which is more preferred).
- The Linux Destination Cache description is appropriate for current kernels: since the IPv6 route cache reform, `ip -6 route show cache` primarily exposes PMTU exceptions and redirected next-hops, which matches the post's framing.
