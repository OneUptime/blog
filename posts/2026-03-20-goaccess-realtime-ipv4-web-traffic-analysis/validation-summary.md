# Validation Summary: How to Set Up GoAccess for Real-Time IPv4 Web Traffic Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GoAccess
- Nginx
- WebSockets
- Shell commands
- Cron
- HTTP access log parsing
- X-Forwarded-For

## Sources Consulted
- GoAccess manual: https://goaccess.io/man
- GoAccess FAQ: https://goaccess.io/faq
- GoAccess downloads/install docs: https://goaccess.io/download
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- NGINX HTTPS server configuration: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/

## Issues Found
- The interactive terminal example mixed `-c` with `--log-format=COMBINED`. I changed it to `goaccess /var/log/nginx/access.log -c` so it matches the documented interactive workflow.
- The rotated-log example used `cat /var/log/nginx/access.log*`, which is brittle when rotated logs are compressed. I changed it to `zcat -f /var/log/nginx/access.log* | goaccess ...`, matching the official guidance for mixed plain and compressed log sets.
- The real-time HTML example used `--ws-url=ws://your-server.com:7890`, which did not match the HTTPS reverse-proxy example and could cause mixed-content or routing problems. I changed it to `--ws-url=wss://analytics.example.com/ws` and added `--addr=127.0.0.1` to align the command with the Nginx proxy setup.
- The same real-time example included `--restore` and `--persist` as a copy-paste first-run command. `--restore` requires existing on-disk database files, so I removed the persistence flags from the baseline example.
- The Nginx HTTPS server block used `listen 443 ssl;` without certificate directives. I added `ssl_certificate` and `ssl_certificate_key` placeholders so the snippet is complete for an HTTPS server.
- The custom log-format example said it was for `X-Forwarded-For or X-Real-IP` but used `%h`, which parses a single host field rather than a forwarded-for list. I narrowed the example to X-Forwarded-For and changed the specifier to `"~h{, }"` to match GoAccess' documented XFF parsing.
- The GoAccess panel descriptions overstated how unique visitors and the Hosts panel work, and listed `Bandwidth` as though it were its own panel. I rewrote those descriptions to match the documented panels and metrics.
- The cron section heading said "Daily HTML Reports" while the cron expression ran hourly. I corrected the heading to match the `0 * * * *` schedule.

## Review Notes
- GoAccess distro packages can lag the latest stable release. The official GoAccess docs specifically recommend the project’s Debian/Ubuntu repository when the latest stable version matters.
- GoAccess supports both IPv4 and IPv6 hosts. The post’s IPv4 framing is acceptable, but the commands are not limited to IPv4-only logs.
- GoAccess docs note that on macOS you may need `gunzip -c` instead of `zcat` when working with compressed rotated logs.
