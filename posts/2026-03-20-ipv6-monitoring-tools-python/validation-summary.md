# Validation Summary: How to Build IPv6 Monitoring Tools in Python - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- IPv6
- `asyncio`
- `ipaddress`
- Linux `iproute2` / `ip neigh`
- NDP (Neighbor Discovery Protocol)
- FRRouting (FRR) / `vtysh`
- BGP
- Prometheus Python client

## Sources Consulted
- Python `asyncio` streams documentation: https://docs.python.org/3/library/asyncio-stream.html#asyncio.open_connection
- Python `asyncio` event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.get_running_loop
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Linux `ip(8)` manual page: https://man7.org/linux/man-pages/man8/ip.8.html
- Linux `ip-neighbour(8)` manual page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Prometheus Python client `Gauge` documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus Python client labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/
- Prometheus Python client HTTP exporter documentation: https://prometheus.github.io/client_python/exporting/http/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
1. The IPv6 availability example described the check as a "ping", but the code actually used `asyncio.open_connection()` for a TCP connect probe. I corrected the wording to describe TCP service availability checks rather than ICMP ping behavior.

2. The availability monitor used `asyncio.get_event_loop()` inside a coroutine and `datetime.utcnow()`. I changed those to `asyncio.get_running_loop()` and `datetime.now(UTC)` to match current Python guidance and avoid the `utcnow()` deprecation warning in current Python releases.

3. The sample targets in the availability monitor mixed a TCP port 80 probe with addresses that are commonly used as DNS endpoints, and it included `2001:db8::1`, which is reserved for documentation by RFC 3849 rather than live monitoring. I changed the example to use real public IPv6 DNS resolvers on TCP port 53 and removed the documentation-only address.

4. The NDP example treated any `ip -6 -j neigh show` failure as an empty result set. I added command error handling so failures are surfaced instead of being misreported as zero neighbors.

5. The BGP example stored `bgpTimerUpEstablishedEpoch` under a misleading `up_down` key and assumed prefix counters were always numeric. I renamed the field to reflect that it is an epoch value and normalized prefix counters so the example is safer against non-numeric or missing data.

6. The Prometheus exporter example was not standalone because it called `get_ndp_stats()` and `get_frr_bgp_ipv6_sessions()` without defining them in that snippet. I inlined the required helper functions so the exporter code block is runnable as written.

7. The Prometheus BGP prefix metric used only `peer_as` as a label, which would merge multiple peers in the same AS into one time series, and it did not clear old labeled series before repopulating them. I changed the metric to label by both `peer` and `peer_as`, and I clear the labeled gauge before each collection pass.

## Review Notes
- Verified locally that `ip -j -6 neigh show` currently returns neighbor `state` as a JSON list, which matches the parsing approach used in the post after the added guard.
- Verified locally that `datetime.utcnow()` emits a deprecation warning in the current Python environment on April 30, 2026.
- The Python snippets compile successfully after the edits.
- I was able to syntax-check the Prometheus exporter snippet, but not run it end-to-end in this workspace because the `prometheus_client` package is not installed locally.
