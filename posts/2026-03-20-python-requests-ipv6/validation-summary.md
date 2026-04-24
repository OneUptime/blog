# Validation Summary: How to Make IPv6 HTTP Requests with Python requests

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python
- Requests
- urllib3
- IPv6
- HTTP/HTTPS
- SOCKS and HTTP proxies
- Happy Eyeballs

## Sources Consulted
- Requests advanced usage documentation: https://requests.readthedocs.io/en/stable/user/advanced/
- `requests.adapters` module documentation: https://requests.readthedocs.io/en/latest/_modules/requests/adapters/
- urllib3 connection reference: https://urllib3.readthedocs.io/en/stable/reference/urllib3.connection.html
- urllib3 advanced usage guide: https://urllib3.readthedocs.io/en/stable/advanced-usage.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 8305, Happy Eyeballs Version 2: https://datatracker.ietf.org/doc/html/rfc8305

## Issues Found
- The tags used inconsistent library names (`Request`, `Urllib3`). I corrected them to `Requests` and `urllib3`.
- The basic-domain example and conclusion overstated IPv6 selection by saying Requests automatically uses AAAA records. I corrected that wording to reflect the actual behavior: Requests/urllib3 use the system resolver and can connect over IPv6 when AAAA records are available.
- The IPv6-only adapter monkeypatched `socket.getaddrinfo` inside `send()`. That approach is process-wide, not adapter-local, and is unsafe once the post later starts parallel requests. I replaced it with a custom `HTTPAdapter` backed by IPv6-only urllib3 connection and pool classes.
- The source-binding example set `IPV6_V6ONLY` unnecessarily and implied a documentation-prefix address would show up on a public echo service. I removed the socket option, added `session.trust_env = False` so proxies do not change the path being demonstrated, and clarified that the bound address must be one assigned on the host and globally routable if it is expected to appear externally.
- The dual-stack example used a 50 ms delay as if it were the Happy Eyeballs connection-attempt delay, and it used `ThreadPoolExecutor` as a context manager, which waits for the losing request before returning. I changed the delay to 250 ms to match the RFC 8305 default guidance for connection attempts and rewrote the executor shutdown so the function can return promptly after the first successful result.
- The HTTPS-by-literal-IP section implied that a custom CA bundle alone was enough. I clarified that certificate validation still requires the certificate to be valid for the IPv6 address when connecting by literal IP.
- The proxy examples used invalid IPv6 literals (`2001:db8::proxy`). I replaced them with syntactically valid IPv6 documentation addresses.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The examples that use `2001:db8::/32` are documentation addresses; readers must replace them with real server, source, or proxy IPv6 addresses before running the examples against live systems.
- The corrected IPv6-only adapter and source-binding adapter patterns were syntax-checked and exercised locally against a temporary IPv6 loopback HTTP server during review.
