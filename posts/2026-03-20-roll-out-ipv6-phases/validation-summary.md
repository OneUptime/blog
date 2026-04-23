# Validation Summary: How to Roll Out IPv6 in Phases

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 addressing and rollout planning
- DNS AAAA records and DNS routing policies
- BIND-style zone file records
- Prometheus HTTP API and PromQL
- curl, ping/ping6, grep, awk
- Python socket APIs
- Happy Eyeballs client connection behavior

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 documentation prefix 2001:db8::/32: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 3596, DNS Extensions to Support IPv6 and AAAA records: https://datatracker.ietf.org/doc/html/rfc3596
- Amazon Route 53 weighted routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- curl man page: https://curl.se/docs/manpage.html
- Python socket.getaddrinfo documentation: https://docs.python.org/3/library/socket.html#socket.getaddrinfo
- RFC 8305, Happy Eyeballs Version 2: https://datatracker.ietf.org/doc/html/rfc8305
- iputils ping/ping6 man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html

## Issues Found
- The Phase 0 examples used `2001:db8:internal::1` and `2001:db8:internal::10`, which are not valid IPv6 literals because IPv6 hextets must be hexadecimal. Changed them to valid RFC 3849 documentation addresses under `2001:db8:100::/48`.
- The DNS canary examples described weighting A versus AAAA responses to make 10% or 50% of clients receive AAAA records. Route 53 weighted routing is defined for records with the same name and type, and AAAA queries return AAAA records for that name. Replaced the A-vs-AAAA weighted-routing guidance with segmented AAAA publication.
- The Phase 2 exit criteria said `< 0.5% (< 5x IPv4 error rate)`, which conflated an absolute threshold with a relative comparison. Changed it to require both `< 0.5%` and `< 5x IPv4 error rate`.
- The Happy Eyeballs check implied that `getaddrinfo()` ordering alone verifies Happy Eyeballs behavior and that IPv6 addresses should always appear first. Updated the wording to note that ordering is OS policy dependent and that representative client behavior should be checked.

## Review Notes
The remaining command examples are illustrative and depend on local metric labels, log formats, and DNS-provider features. The Prometheus query and curl usage are syntactically valid, but production dashboards should also handle zero IPv6 request volume to avoid divide-by-zero results.
