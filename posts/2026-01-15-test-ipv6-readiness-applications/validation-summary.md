# Validation Summary: How to Test IPv6 Readiness for Your Applications

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6 networking and addressing
- DNS A, AAAA, and PTR records
- ICMPv6, TCP, UDP, TLS, HTTP, HTTPS, and WebSocket testing
- Linux command-line tools: ping, traceroute, curl, dig, nslookup, netcat, ss, ip6tables
- Python socket, ssl, requests, websocket-client, database, queue, and load-test examples
- Node.js dns, net, and https APIs
- Go net and net/http APIs
- GitHub Actions
- Docker Compose
- PostgreSQL, MySQL, Redis, MongoDB, RabbitMQ, and Kafka connectivity examples

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 4291: IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4443: ICMPv6 for IPv6: https://www.rfc-editor.org/rfc/rfc4443
- RFC 3986: URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986
- Python socket documentation: https://docs.python.org/3/library/socket.html
- Docker Compose file reference and networks reference: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- websocket-client documentation: https://websocket-client.readthedocs.io/en/latest/examples.html
- urllib3 utilities documentation: https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html
- Node.js net and https API documentation: https://nodejs.org/api/net.html and https://nodejs.org/api/https.html
- Google IPv6 statistics page: https://www.google.com/intl/en/ipv6/statistics.html
- Local CLI help/man output for ping, curl, netcat, ss, dig, nslookup, and ip6tables.

## Issues Found
- The first Python socket example caught `socket.timeout` and `socket.error`, both documented as deprecated aliases in modern Python. Changed them to `TimeoutError` and `OSError`.
- The WebSocket IPv6 example passed `(socket.AF_INET6, socket.SOCK_STREAM, 0)` as a `sockopt` tuple, but websocket-client `sockopt` expects socket option tuples such as `(level, option, value)`. Replaced it with a scoped `socket.getaddrinfo` patch that resolves WebSocket connections with `AF_INET6`, then restores the original resolver.
- The IPv6 load-test example called `statistics.stdev()` even when only one request succeeded, which raises `StatisticsError`. Added a one-sample guard and clamped percentile indexes to valid list bounds.
- The GitHub Actions workflow invoked `ipv6_load_test.py` with `--requests` and `--concurrency`, but the script parses those values as positional arguments. Updated the workflow invocation to pass `500` and `20` positionally.
- The GitHub Actions connectivity check used `ping6`; GitHub documents that inbound ICMP can be blocked on hosted runners, so this is not a reliable HTTPS readiness check. Changed it to `curl -6 --connect-timeout 10 https://ipv6.google.com`.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. Removed it so the snippet follows the current Compose Specification guidance.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some examples intentionally use monkey-patching to force IPv6 in Python HTTP clients; that is acceptable for short-lived test scripts but should be isolated from long-running production processes.
