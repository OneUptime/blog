# Validation Summary: How to Enable HAProxy Sticky Sessions Using Source IPv4 Address Hashing

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy sticky sessions / session persistence
- HAProxy stick tables
- HAProxy Runtime API
- `socat`

## Sources Consulted
- HAProxy Configuration Manual 3.3: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Management Guide 3.2: https://docs.haproxy.org/3.2/management.html
- HAProxy session persistence tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/session-persistence/
- HAProxy stick tables tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- HAProxy Runtime API installation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Runtime API `show table`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/
- HAProxy Runtime API `clear table`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/clear-table/

## Issues Found
- The cookie-based persistence snippet used the HTTP-only `cookie` directive without declaring `mode http`. I added `mode http` so the example is valid on its own.
- The custom-header stick-table example used `req.hdr(X-Session-ID)`, which is an HTTP request sample fetch, without declaring `mode http`. I added `mode http` for correctness.
- The explanation for `stick-table type ip size 200k` said it held 200,000 entries. HAProxy uses 1024-based sizing here, so `200k` is 204,800 entries. I corrected the value.
- The `show table` explanation said the output shows client IPs and the server they are mapped to. HAProxy’s documented output shows the table entries and stored fields; it does not directly print backend server names in that way. I corrected the sentence.
- The comparison table marked cookie persistence as non-stateless and stick tables as stateless, which was reversed from how HAProxy implements them. I corrected the `Stateless?` column so cookie insertion is stateless at the load balancer and stick tables are stateful.

## Review Notes
- The Runtime API commands assume an admin socket is configured at `/run/haproxy/admin.sock` and that `socat` is installed.
- `type ip` is IPv4-only for stick tables. Use `type ipv6` when the key must be an IPv6 address.
- The custom-header example uses `len 32`; if a real session token can exceed 32 characters, that length should be increased to avoid truncation.
