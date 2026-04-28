# Validation Summary: How to Configure Nginx for IP-Based Virtual Hosting on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP server, `listen`/`server_name`/`try_files` directives, `sites-available`/`sites-enabled` pattern)
- IPv4 networking
- iproute2 (`ip -4 addr show`)
- systemd (`systemctl reload`)
- TLS / HTTPS server block configuration
- curl
- Mermaid (for the diagram)

## Sources Consulted
- Nginx core HTTP module — `listen` directive: http://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx core HTTP module — `server_name` directive: http://nginx.org/en/docs/http/ngx_http_core_module.html#server_name
- Nginx core HTTP module — `try_files`: http://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- Nginx admin guide — Configuring HTTPS Servers: https://nginx.org/en/docs/http/configuring_https_servers.html
- iproute2 `ip-address(8)` man page
- curl manual — `--resolve` option: https://curl.se/docs/manpage.html

## Issues Found
No technical issues found.

- `listen <ip>:<port>` is the documented syntax for binding a server block to a specific address.
- `server_name _;` is a well-known idiom: `_` is an invalid hostname that won't match any real `Host` header, so combined with a unique listen address this server block becomes the default for that socket — matching the author's "catch all hostnames on this IP" intent.
- `try_files $uri $uri/ =404;` is standard.
- `ln -s /etc/nginx/sites-available/... /etc/nginx/sites-enabled/`, `nginx -t`, and `systemctl reload nginx` are all correct for the Debian/Ubuntu Nginx packaging.
- `listen <ip>:443 ssl;` with `ssl_certificate` / `ssl_certificate_key` is the correct (and still current) directive form.
- The mermaid `graph TD` flowchart syntax is valid.

## Review Notes
- The verification section mentions using `curl --resolve` "or specify the IP directly" but only demonstrates the latter. That's fine — when fetching `http://192.168.1.10/` the `Host` header defaults to the IP, which `server_name _` matches.
- On modern Nginx (1.25+), HTTP/2 is enabled with the separate `http2 on;` directive rather than `listen ... ssl http2;`. The post's HTTPS snippet doesn't enable HTTP/2 either way, so this is not an inaccuracy — just a forward-looking note if the author later expands the TLS section.
- The closing claim that IP-based hosting is "suitable for non-HTTP protocols" is a general principle (the routing happens at the socket level), but Nginx server blocks shown here are still HTTP-context. Technically defensible as a conceptual aside; not a code-level error.
