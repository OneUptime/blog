# Validation Summary: How to Build IPv6 Monitoring Tools in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3
- IPv6
- ICMP reachability monitoring with `ping`
- Prometheus Python client
- FRRouting (`vtysh`)
- HTTP monitoring with `requests`

## Sources Consulted
- Prometheus Python client docs, HTTP/HTTPS exporting: https://prometheus.github.io/client_python/exporting/http/
- Prometheus Python client docs, Gauge: https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus Python client docs, Labels: https://prometheus.github.io/client_python/instrumenting/labels/
- Requests quickstart: https://requests.readthedocs.io/en/master/user/quickstart/
- Requests API reference: https://requests.readthedocs.io/en/latest/api/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting source, BGP route JSON output: https://github.com/FRRouting/frr/blob/master/bgpd/bgp_route.c
- FRRouting source, AS path JSON structure: https://github.com/FRRouting/frr/blob/master/bgpd/bgp_aspath.c
- RFC 3986, URI generic syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html
- Local `ping -h` output from the review environment's `iputils` package, which documents `-6` as the IPv6 flag

## Issues Found
- The ICMP example invoked a `ping6` command directly. On current `iputils`, the documented IPv6 form is `ping -6`, so I updated the subprocess call and the conclusion text to match the current CLI.
- The RTT display in the first example used `if result.rtt_ms`, which would incorrectly render a valid `0.0` ms result as `N/A`. I changed it to an explicit `is not None` check.
- The sample `2001:db8::1` address was labeled as "Your gateway". Since `2001:db8::/32` is reserved for documentation, I clarified that the reader should replace it with their real IPv6 gateway.
- The Prometheus example only started daemon threads, so the process would exit immediately after printing the URL. I changed the thread setup to keep the exporter running.
- The Prometheus example printed `http://[::1]:9100/metrics`, but `start_http_server(9100)` defaults to an IPv4 bind address in the current client. I corrected the sample URL to `http://127.0.0.1:9100/metrics`.
- The Prometheus RTT gauge was only updated on success, which would leave a stale latency value behind after a host became unreachable. I now remove that labeled sample when no RTT is available.
- The FRRouting parser assumed `aspath` was a plain string, but current FRR JSON emits `aspath` as an object containing fields such as `string`, `segments`, and `length`. I updated the example to read the string form safely.
- The HTTP monitor used invalid bracketed host literals like `2001:db8::web` and `2001:db8::api`, which are not valid IPv6 addresses and fail Requests URL parsing. I replaced them with valid IPv6 documentation addresses.

## Review Notes
- The FRRouting docs confirm `show bgp ipv6 unicast json` is a valid command, but they do not fully document every JSON field shape. The `aspath`, `nexthops`, `valid`, and `bestpath.overall` checks were verified against FRR's current source.
- The edited Python code blocks were syntax-checked locally with Python 3.12.3. The corrected IPv6 HTTP sample URLs were also parsed successfully with `requests` 2.31.0.
