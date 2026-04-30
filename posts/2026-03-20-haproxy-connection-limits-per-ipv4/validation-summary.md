# Validation Summary: How to Configure HAProxy Connection Limits per IPv4 Client

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy stick tables
- HAProxy runtime/admin socket commands
- `socat`
- Shell commands

## Sources Consulted
- HAProxy Configuration Manual 3.2: https://docs.haproxy.org/3.2/configuration.html
- HAProxy Management Guide 3.2: https://docs.haproxy.org/3.2/management.html

## Issues Found
- The `Per-Backend Connection Limits` example used `maxconn 500` inside a `backend` section. HAProxy documents `maxconn <conns>` as a frontend/listen limit, not a backend keyword, so I removed it and kept the valid per-server `server ... maxconn` directives.
- The `global maxconn` comment described the limit as HAProxy-wide. The configuration manual defines global `maxconn` as a per-process concurrent connection limit, so I corrected the comment.
- The `show table` pipeline used `sort -t= -k2 -n -r`, which did not sort by `conn_cur` and only matched two-digit counts. I replaced it with HAProxy's documented `show table <name> data.conn_cur gt <value>` filter.
- The `clear table` note said the command would "reset its counter". HAProxy's runtime API removes the stick-table entry instead, so I corrected the description.

## Review Notes
- The post is accurate for its stated IPv4 scope after the fixes above.
- Local `haproxy` was not installed in the workspace, so validation was performed against the official HAProxy manuals rather than by running `haproxy -c`.
