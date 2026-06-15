# Validation Summary: How to Integrate Node.js with Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Nginx reverse proxy
- Nginx upstream load balancing
- Nginx rate limiting
- TLS/HTTPS with Let's Encrypt and Certbot
- PM2 process management

## Sources Consulted
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx HTTP load balancing documentation: https://nginx.org/en/docs/http/load_balancing.html
- Nginx Plus HTTP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies/
- Certbot user guide for the Nginx plugin: https://eff-certbot.readthedocs.io/en/stable/using.html#nginx
- PM2 documentation: https://pm2.keymetrics.io/docs/usage/specifics/

## Issues Found
- The comparison table described Nginx SSL termination as "Hardware accelerated." Nginx does not inherently make TLS hardware accelerated, so this was changed to "Handled by reverse proxy."
- The comparison table labeled rate limiting as "DDoS protection." Nginx rate limiting is useful abuse protection but is not complete DDoS protection, so the wording was narrowed to "Traffic abuse protection."
- The basic proxy configuration said `proxy_cache_bypass $http_upgrade` disables buffering. That directive controls cache bypass, not proxy buffering, so the comment was corrected.
- Several examples used `listen 443 ssl http2;`. Current Nginx documentation uses `listen 443 ssl;` with `http2 on;`, so the snippets were updated.
- The upstream `keepalive` directive was labeled as a health check setting. It controls idle upstream connection reuse, so the comment was corrected and the proxy location now clears the `Connection` header for upstream keepalive reuse.
- The PM2 load-balancing commands started clustered workers behind one port while the Nginx upstream configured three different ports. The commands were changed to start separate processes on ports 3000, 3001, and 3002, with a note that PM2 cluster mode should be proxied through one port.
- The health-check section implied open source Nginx would use the `/health` endpoint. Open source Nginx upstream checks are passive and do not actively call that endpoint, so the text now distinguishes Nginx Plus active checks or external monitoring from open source passive checks.

## Review Notes
The JavaScript snippets were checked with `node --check` and parse successfully. Nginx was not installed in the local workspace, so `nginx -t` could not be run locally; Nginx configuration changes were verified against official Nginx directive documentation instead.
