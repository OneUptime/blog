# Validation Summary: How to Configure HAProxy Stick Tables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HAProxy stick tables
- HAProxy session persistence
- HAProxy rate limiting and abuse detection
- HAProxy peers replication
- HAProxy Runtime API
- HAProxy Prometheus exporter
- Prometheus scrape configuration

## Sources Consulted
- HAProxy Configuration Manual, latest: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy stick tables tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- HAProxy traffic policing tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/traffic-policing/
- HAProxy Prometheus metrics tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy Runtime API, show table: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/
- HAProxy Runtime API, clear table: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/clear-table/

## Issues Found
- Replaced IPv4 stick-table examples from `type ip` to `type ipv4`. HAProxy 3.2 documents `ip` as a transitional alias for `ipv4` and recommends the explicit `ipv4` type.
- Corrected the integer query-parameter persistence example from `url_param(user_id)` to `urlp_val(user_id)`, so the extracted value matches an integer stick-table key.
- Clarified the source-IP-plus-cookie persistence example because HAProxy persistence cookies take precedence when present; source-IP stickiness covers first requests and cookieless clients.
- Corrected the tiered rate-limiting tarpit description and snippet. `http-request tarpit` holds the request for `timeout tarpit`, then returns an error response; it does not delay and then forward to the backend.
- Fixed API-key rate-limit tiers so premium and standard keys do not fall through to the default 10 req/min limit.
- Removed the inaccurate "using map file" comment from the API-key example because the snippet uses prefix ACLs, not a map file.
- Changed the bad-bot example to store a single `http_req_rate` period in one stick table.
- Fixed the peer replication example by removing the incompatible `bind *:1024` line from the old-style `peer <name> <address>:<port>` peers declaration and adding `localpeer` guidance.
- Added `mode http` to the Prometheus exporter snippet so the standalone frontend is complete and explicit.

## Review Notes
- Verified representative patched HAProxy configuration syntax with the official `haproxy:3.2` container image (`HAProxy version 3.2.19`, `haproxy -c`).
- The examples are suitable for HAProxy 3.2-era syntax. Operators on older HAProxy versions should verify `ipv4` key-type support before replacing legacy `type ip` in production configurations.
