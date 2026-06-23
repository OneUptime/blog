# Validation Summary: How to Expose Docker Containers to the Internet Safely

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker / Docker Compose
- Traefik (v3.0) reverse proxy
- Nginx reverse proxy
- Let's Encrypt / ACME (HTTP-01 and TLS-01 challenges)
- Certbot
- fail2ban (crazymax/fail2ban image)
- TLS configuration (ciphers, protocols, HSTS)

## Sources Consulted
- Traefik v3 Docker provider & middleware docs (ipAllowList, rateLimit, basicAuth, redirectScheme, headers, chain) — https://doc.traefik.io/traefik/
- Traefik ACME / Let's Encrypt resolver docs (httpChallenge, tlsChallenge) — https://doc.traefik.io/traefik/https/acme/
- Nginx ngx_http_limit_req_module docs — https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx ngx_http_limit_conn_module docs — https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html
- Nginx HTTP/2 `http2 on;` directive (1.25.1+) — https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Certbot webroot plugin docs — https://eff-certbot.readthedocs.io/
- fail2ban jail/filter documentation and crazymax/fail2ban image docs — https://github.com/crazy-max/docker-fail2ban

## Issues Found
1. **Invalid `limit_req off;` directive (nginx config).** In the "Nginx Configuration" example, the `/health` location used `limit_req off;` to disable rate limiting. The `limit_req` directive has no `off` parameter — nginx would refuse to start with an "invalid parameter" error. Additionally, the rate/connection limiting directives were placed at the `server` level, which means every location (including `/health`) inherits them; there is no per-location way to "turn them off."
   - **Fix:** Moved `limit_req zone=api_limit burst=20 nodelay;` and `limit_conn conn_limit 10;` from the `server` block into the `location /` block, and removed the invalid `limit_req off;` line from `location /health`. Because `limit_req`/`limit_conn` are now only declared in `location /`, the `/health` location is naturally excluded from rate/connection limiting — matching the author's stated intent with valid, working configuration. Also tightened the accompanying comment ("nodelay rejects excess with 503 immediately") for accuracy.

## Review Notes
- **X-XSS-Protection header:** The post sets `X-XSS-Protection "1; mode=block"`. This header is deprecated in modern browsers (which now rely on Content-Security-Policy) and OWASP currently recommends `X-XSS-Protection: 0`. It is not incorrect or harmful, so it was left as-is, but a future update could replace it with a Content-Security-Policy example.
- **Traefik `https-redirect` in the "Complete Production Setup":** The middleware chain applies `https-redirect` to the `api` router, which only listens on the `websecure` (HTTPS) entrypoint, and no router is defined on the `web` (HTTP) entrypoint. The redirect is therefore effectively a no-op (HTTPS→HTTPS). This is a design imperfection rather than a syntax/technical error — the config is valid and starts fine — so it was left unchanged. A cleaner setup would define a separate HTTP router (as shown in the earlier "HTTPS Redirect" section) or use a global entrypoint-level redirect.
- Traefik v3 middleware names were verified as correct for v3.0 (`ipallowlist` replaced v2's `ipwhitelist`; `ratelimit.average`/`ratelimit.burst`, `basicauth.users`, `redirectscheme.scheme`, and `headers.*` are all current).
- The `~160,000 IPs` claim for a 10m `limit_req_zone` is accurate (nginx documents ~16k `$binary_remote_addr` states per 1MB for IPv4).
- `http2 on;` (separate from `listen 443 ssl;`) is the correct modern syntax for nginx 1.25.1+, which `nginx:alpine` satisfies.
- The certbot renewal entrypoint, fail2ban jail/filter syntax, and quick-reference commands (`htpasswd -nb`, `openssl s_client`, `fail2ban-client` subcommands) are all correct.
