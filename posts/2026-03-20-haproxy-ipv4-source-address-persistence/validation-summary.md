# Validation Summary: How to Set Up HAProxy with IPv4 Source Address Persistence

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- HAProxy stick tables
- HAProxy Runtime API / admin socket
- TCP load balancing
- HTTP load balancing
- Shell commands with `curl` and `socat`

## Sources Consulted
- HAProxy Configuration Manual 3.2: `balance source` behavior and its remapping caveat when the running server set changes. https://docs.haproxy.org/3.2/configuration.html
- HAProxy Configuration Manual 3.1: `stick match`, `stick on`, `stick store-request`, and `option redispatch`. https://docs.haproxy.org/3.1/configuration.html
- HAProxy config tutorial, Session persistence: documented IP-based persistence example using `stick-table` and `stick on src`. https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/session-persistence/
- HAProxy config tutorial, Retries and redispatches: retry and `option redispatch` behavior. https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/retries/
- HAProxy Runtime API reference, `show table`: runtime command syntax for inspecting stick tables. https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/

## Issues Found
- The general explanation described source-address persistence as always hash-based. I corrected it to distinguish `balance source` hashing from stick-table persistence, which records and reuses the selected server for a source IP.
- The `balance source` limitation only mentioned a server going down. I corrected this to match the manual: remapping happens when the set of running servers changes, including servers going up or down.
- The stick-table example used both `stick on src` and `stick match src`. I removed the redundant `stick match src` line because the HAProxy manual defines `stick on` as equivalent to `stick match` plus `stick store-request`.
- The failover explanation for `option redispatch` was too absolute. I corrected the wording to describe the documented retry-based behavior more precisely.
- The verification commands had two problems: `curl -s ... | grep "Server:"` would not show HTTP headers, and grepping the stick table with `curl ifconfig.me` could mismatch the client IP as seen by HAProxy. I updated the example to use `curl -si` and to inspect the stick table directly via `show table`.

## Review Notes
- The admin socket path in the verification example is environment-specific and assumes HAProxy's Runtime API/admin socket is configured at `/var/run/haproxy/admin.sock`.
- I could not run HAProxy's local config parser in this workspace because the `haproxy` binary is not installed, so syntax validation was done against the official HAProxy documentation rather than a local executable.
