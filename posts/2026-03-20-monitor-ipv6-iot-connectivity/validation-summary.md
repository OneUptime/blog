# Validation Summary: How to Monitor IPv6 IoT Device Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 (RFC 4291 addressing, RFC 3849 documentation prefix)
- Linux iputils `ping6` / `ping -6`
- iproute2 (`ip -6 neigh`, `ip -6 route`, `ip -6 monitor`)
- Python `subprocess` and `asyncio`
- Prometheus `prometheus_client` Python library (Gauge metrics, `start_http_server`)
- CoAP (RFC 7252) and the `aiocoap` Python library
- Prometheus alerting rules (YAML)
- 6LoWPAN-style mesh interfaces (`lowpan0`)

## Sources Consulted
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`): https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291 — IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 7252 — The Constrained Application Protocol (CoAP): https://datatracker.ietf.org/doc/html/rfc7252
- iputils `ping` man page (`-c`, `-W` flags): https://man7.org/linux/man-pages/man8/ping.8.html
- iproute2 `ip-neighbour(8)`, `ip-route(8)`, `ip-monitor(8)` man pages: https://man7.org/linux/man-pages/man8/ip.8.html
- aiocoap documentation: https://aiocoap.readthedocs.io/en/latest/
- Prometheus Python client: https://github.com/prometheus/client_python
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- **Invalid IPv6 addresses in examples** — The original post used placeholder addresses such as `2001:db8:mesh:1::sensor1`, `2001:db8:mesh:1::sensor2`, and `2001:db8:mesh:1::door1`. IPv6 addresses are hexadecimal (0–9, a–f); the strings `mesh`, `sensor1`, `sensor2`, and `door1` contain non-hex characters and would fail to parse. Replaced with valid documentation-prefix addresses (`2001:db8:1::1`, `2001:db8:1::2`, `2001:db8:1::a1`) under the RFC 3849 reserved range so the YAML config and the CoAP code now contain syntactically valid IPv6 literals.

## Review Notes
- The Prometheus exporter binds to TCP port 9100, which is the well-known default for `node_exporter`. On any host that also runs `node_exporter`, the two will collide. A custom IoT exporter would conventionally use a port outside the standard exporter range (for example 9101+). Left as-is because the post's host context is not specified and the code is otherwise correct, but worth noting.
- `ping6` works on most Linux distributions but has been deprecated on Debian/Ubuntu in favour of `ping -6`; both forms still work today, so this is not a correctness issue but may need updating in a few years.
- The exporter imports `Counter` from `prometheus_client` but never uses it — harmless dead import.
- The grep alternation `"REACHABLE\|STALE\|DELAY\|PROBE"` in Step 5 relies on GNU grep's basic-regex `\|` extension, which is the default on Linux. It is portable to BusyBox grep and macOS grep as well.
- `aiocoap.Message(code=aiocoap.GET, uri=...)` is the correct constructor signature; `Context.create_client_context()` and `protocol.request(request).response` match the current public aiocoap API.
- Alert thresholds and `for:` durations are reasonable but should be tuned per fleet — sleepy IoT endpoints can legitimately be unreachable for long sleep intervals, as the conclusion notes.
