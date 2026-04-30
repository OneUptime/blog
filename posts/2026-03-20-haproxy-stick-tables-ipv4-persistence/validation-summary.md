# Validation Summary: How to Set Up HAProxy Stick Tables for IPv4 Client Session Persistence

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy stick tables
- HAProxy Runtime API
- IPv4 session persistence
- Cookie-based affinity

## Sources Consulted
- HAProxy Configuration Manual 3.3: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Management Guide 3.2: https://docs.haproxy.org/3.2/management.html
- HAProxy Runtime API `show table`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/
- HAProxy Runtime API `clear table`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/clear-table/

## Issues Found
- The post used `stick-table type ip` for IPv4-specific examples. In current HAProxy documentation, `ip` is a transitional alias and `ipv4` is the preferred explicit type for IPv4 tables. I changed the IPv4 examples to `type ipv4`.
- The cookie-based stickiness example used `stick on cookie(SERVERID)`, which relies on a deprecated sample fetch and does not explicitly show learning the cookie value from the response. I changed it to `stick match req.cook(SERVERID)` with `stick store-response res.cook(SERVERID)` so the table learns the response cookie and matches it on later requests.
- The Runtime API commands used `show table backend app_servers` and `clear table backend app_servers`, but HAProxy expects the stick-table name directly. I changed those commands to `show table app_servers` and `clear table app_servers`.
- The peers example omitted the requirement that the local peer name must match one of the declared peer entries. I added a brief clarification noting that this can be done via the hostname or `global localpeer`.

## Review Notes
- `type ipv4` is the current explicit syntax in HAProxy 3.2 and later. Older HAProxy releases only support `type ip`, so the post now implicitly targets current HAProxy syntax rather than older branches.
- The management commands assume HAProxy's Runtime API socket is configured at `/run/haproxy/admin.sock` with sufficient privileges, and that `socat` is available on the host.
- The rate-tracking example is consistent with current stick-table counters, including `conn_cur`, `conn_rate`, `http_req_rate`, and `http_err_rate`.
