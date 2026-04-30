# Validation Summary: How to Track IPv4 Client Connections with HAProxy Stick Tables

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HAProxy
- HAProxy stick tables
- HAProxy peers replication
- HAProxy Runtime API
- IPv4
- Session persistence
- Connection limiting
- HTTP rate limiting

## Sources Consulted
- HAProxy Configuration Manual 3.3: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Management Guide 3.3: https://docs.haproxy.org/3.3/management.html
- HAProxy Management Guide 3.2, Unix Socket commands: https://docs.haproxy.org/3.2/management.html
- HAProxy Runtime API, `show table`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/
- HAProxy configuration tutorial, "Stick tables": https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/

## Issues Found
- The introduction overstated stick-table scope by saying they work "across all HAProxy processes". I corrected this to describe per-instance behavior and clarified that peer synchronization is separate and that `conn_cur` is local-only by default, which matches the HAProxy configuration manual.
- The counter descriptions used looser wording than the HAProxy documentation. I updated `conn_rate(10s)`, `http_req_rate(10s)`, and `bytes_in_rate(1m)` to describe them as average rates over the configured period, which is how HAProxy defines these data types.
- The rate-limiting section described `http_req_rate(10s)` as a "10-second sliding window". I changed that to "over a 10-second period" to match HAProxy's documented frequency-counter semantics more precisely.
- The Runtime API example implied `/var/run/haproxy/admin.sock` would simply exist. I added the assumption that a Runtime API / stats socket is configured at that path, because HAProxy does not enable the socket by default.

## Review Notes
- The HAProxy directives and CLI examples in the post are valid after the edits, including `stick on src`, `tcp-request connection track-sc0 src`, `http-request track-sc0 src`, `sc_conn_cur(0)`, `sc_http_req_rate(0)`, `peers`, and `show table`.
- I could not run a local `haproxy -c` syntax check in this workspace because the `haproxy` binary is not installed.
