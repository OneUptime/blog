# Validation Summary: How to Configure Grafana to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana
- `grafana.ini`
- Nginx
- UFW
- `systemd`
- HTTP/HTTPS

## Sources Consulted
- Grafana configuration reference: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana default configuration (`conf/defaults.ini`): https://raw.githubusercontent.com/grafana/grafana/main/conf/defaults.ini
- Run Grafana behind a reverse proxy: https://grafana.com/tutorials/run-grafana-behind-a-proxy/
- Set up Grafana HTTPS for secure web traffic: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-https/
- Other HTTP API (`/api/health`): https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/other/
- Start the Grafana server: https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/
- `ufw` local manual page (`man ufw`)
- `ss` local help output (`ss --help`)

## Issues Found
- The post placed `allow_sign_up = false` under `[security]`, but Grafana documents `allow_sign_up` under `[users]`. I moved it into a `[users]` block so the configuration matches Grafana's current config structure.
- The post described `domain` as being for cookie security. Grafana documents it as the public-facing domain name used to access Grafana, so I corrected the comment to reflect its actual purpose for public links and redirects.
- The post implied uncommenting `socket = ...` alone was enough for Unix socket binding. Current Grafana defaults show Unix socket use depends on the server protocol/socket settings, so I clarified that `protocol = socket` is required for the socket-only alternative shown.
- The reverse proxy snippet labeled `serve_from_sub_path = false` as trusting reverse proxy headers, which is incorrect. I changed the comment to explain that `serve_from_sub_path` only matters when Grafana is served from a URL sub-path.
- The firewall example opened port `3000` without specifying protocol. Grafana serves HTTP over TCP, so I tightened the example to `proto tcp` / `3000/tcp` to avoid an unnecessarily broad rule.
- The security snippet could be read as though `admin_password` changes the live admin password at any time. Grafana documents `admin_user` and `admin_password` as the default initial admin credentials, so I added a clarifying comment that they are used on first start.

## Review Notes
- The verification command using `GET /api/health` is still documented and valid as of April 30, 2026, but Grafana 13 documentation notes that legacy `/api` endpoints are being deprecated in favor of `/apis`. The post remains correct today, but this endpoint should be rechecked in future reviews.
- The Nginx reverse proxy example is sufficient for basic HTTP proxying. Grafana's current reverse proxy tutorial includes extra WebSocket handling for Grafana Live, but the post does not discuss Grafana Live specifically, so I did not expand the snippet.
