# Validation Summary: How to Configure HAProxy for Zero-Downtime Deployments on IPv4

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HAProxy
- HAProxy Runtime API
- Bash
- `systemd`
- `socat`

## Sources Consulted
- HAProxy Runtime API installation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Runtime API `set server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- HAProxy Runtime API `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Runtime API `show servers conn`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-conn/
- HAProxy Runtime API `add server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/add-server/
- HAProxy Runtime API `enable server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/enable-server/
- HAProxy Runtime API `enable health`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/enable-health/
- HAProxy 3.2 Management Guide: https://docs.haproxy.org/3.2/management.html
- HAProxy Enterprise service management docs: https://www.haproxy.com/documentation/haproxy-enterprise/administration/manage-service/

## Issues Found
- The original `haproxy -c` note assumed HAProxy would always print `Configuration file is valid`. Current HAProxy documentation treats a zero exit status as the reliable success signal and documents `-V` for printing a success message, so the note was corrected.
- The post described `set server ... state drain` as stopping all new connections. HAProxy documents `drain` as removing the server from load balancing while still permitting persistent connections, so the explanation and inline comments were corrected.
- The drain example and rolling deployment script used `show servers conn` as if it were a stable scripted per-server counter. HAProxy documents `show servers conn` as a debugging command whose output varies with thread behavior, so those examples were rewritten to use `show stat` and the documented `scur` field instead.
- The runtime API commands used a bare UNIX socket path with `socat`. HAProxy’s Runtime API installation guide documents the `unix-connect:/run/haproxy/admin.sock` form, so the commands were updated to the documented syntax.
- The one-off drain example used a placeholder `deploy_new_version` command that would not execute as written. It was replaced with a concrete `sudo /opt/app/deploy.sh` example to match the rolling deployment script.
- The dynamic server example added a server but omitted the documented enablement steps and health-check caveat. It was updated to add the server with `check port 8080`, then `enable server`, then `enable health`, and the text now notes that runtime-added servers are in-memory only and require a compatible dynamic load-balancing algorithm.
- The blue-green section implied weight changes switch all traffic immediately. The wording was tightened to describe shifting new load-balanced traffic, which is the accurate behavior when persistent connections exist.

## Review Notes
- `add server` is available in HAProxy 2.4 and later.
- `show servers conn` is available in HAProxy 2.2 and later, but HAProxy documents it for debugging rather than regular monitoring.
- Runtime API changes are not persisted to disk and are lost on reload unless the configuration file is updated separately.
