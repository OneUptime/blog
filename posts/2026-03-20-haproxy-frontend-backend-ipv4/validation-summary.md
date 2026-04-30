# Validation Summary: How to Set Up HAProxy Frontend and Backend with IPv4 Addresses

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HAProxy
- HAProxy Runtime API
- IPv4 networking
- HTTP load balancing
- Linux CLI tools (`haproxy`, `socat`, `ss`, `curl`, `systemctl`)

## Sources Consulted
- HAProxy Configuration Manual (latest): https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy health checks tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy statistics dashboard tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/statistics/
- HAProxy Runtime API installation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/

## Issues Found
- The `api_backend` example used the deprecated pattern of appending HTTP/1.1 headers directly on the `option httpchk` line. I replaced it with `option httpchk` plus `http-check send ... hdr Host ...`, which is the current documented way to add headers to HTTP health checks.
- The health-check section described `option tcp-check` as the default TCP health check. HAProxy's documented default is a TCP connection attempt when `check` is enabled on the `server` line; `option tcp-check` is used for tcp-check rule sequences. I corrected the explanation to reflect that.
- The Runtime API example used `socat` without the `unix-connect:` address type for a UNIX socket. I corrected the command to `sudo socat stdio unix-connect:/run/haproxy/admin.sock`.
- The stats test command used `curl` against a stats page protected by `stats auth` but omitted credentials and described it as an API call. I updated it to `curl -u admin:securepass http://10.0.0.1:8404/stats` and clarified that it views the stats page.

## Review Notes
- The post is now technically consistent with the current HAProxy documentation for frontend/backend layout, load-balancing algorithms, server weights, backup servers, and HTTP health-check configuration.
- `stats admin if LOCALHOST` is consistent with examples in the HAProxy configuration manual, although newer tutorials typically demonstrate custom ACL expressions for tighter control.
- I could not run a local `haproxy -c` validation in this workspace because `haproxy` and `socat` were not installed here; the review was completed against official documentation.
