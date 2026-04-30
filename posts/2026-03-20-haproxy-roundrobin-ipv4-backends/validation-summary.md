# Validation Summary: How to Set Up HAProxy with Roundrobin Load Balancing for IPv4 Backends

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy Runtime API
- IPv4 backend configuration
- Round-robin load balancing
- Linux shell and systemd commands

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy 3.3 Configuration Manual: https://docs.haproxy.org/3.3/configuration.html
- HAProxy Runtime API Installation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Runtime API `set server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- HAProxy Runtime API `disable server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/disable-server/
- HAProxy Runtime API `enable server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/enable-server/

## Issues Found
- The introduction said round robin is HAProxy's default load-balancing algorithm. I changed this to describe explicit `balance roundrobin` behavior instead, because current HAProxy documentation differs by version on the implicit default algorithm and the post already configures `roundrobin` explicitly.
- The Runtime API example used `disable server` and `enable server` while describing graceful draining, and it used `socat stdio /run/haproxy/admin.sock`. I changed it to `set server ... state drain` and `state ready`, and to `socat stdio unix-connect:/run/haproxy/admin.sock`, because `drain` is the documented runtime state for removing a server from load balancing without putting it into maintenance mode, and the official UNIX socket examples use `unix-connect:`.
- The runtime API socket required by the `socat` examples was not configured in the HAProxy snippet. I added `stats socket /run/haproxy/admin.sock mode 660 level admin` to the `global` section so the later commands have the required admin socket.
- The `slowstart` section incorrectly described it as protecting newly added or newly enabled servers and said weight rises from 0 to the configured weight. I corrected it to servers returning to service, and to an effective weight increase from 1 to 100% of the configured weight for dynamic algorithms such as `roundrobin`.
- The request-verification example implied a comma-separated output without ensuring line breaks or explaining the `/server-id` endpoint assumption. I updated the loop to print one response per line and clarified that each backend must return its own name at that path.

## Review Notes
- The post is now technically accurate for the documented configuration and runtime API behavior.
- Relying on an explicit `balance roundrobin` setting is safer than relying on version-dependent defaults.
- The stats frontend is open on `0.0.0.0:8404` with no authentication. That is acceptable for a simple internal example, but a production deployment should restrict access and add authentication.
