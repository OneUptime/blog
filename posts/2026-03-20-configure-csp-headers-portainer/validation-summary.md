# Validation Summary: How to Configure Content-Security-Policy Headers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Content Security Policy (CSP)
- Nginx
- Traefik
- HTTP security headers
- WebSockets

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy docs for nginx: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer reverse proxy docs for Traefik: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer FAQ on built-in CSP / iframing: https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-doesnt-the-portainer-ui-load-inside-an-iframe
- Portainer source for current built-in security headers: https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Traefik headers middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- W3C Content Security Policy Level 3: https://www.w3.org/TR/CSP3/
- MDN `connect-src` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src
- MDN `X-XSS-Protection` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN `Referrer-Policy` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy

## Issues Found
- The Nginx example used `listen 443 ssl http2;`, which is outdated for current Nginx. I changed it to `listen 443 ssl;` plus `http2 on;` to match the current Nginx HTTP/2 documentation.
- The post implied that a reverse-proxy CSP can simply be added on top of Portainer. Portainer already sends its own `Content-Security-Policy` header by default, and CSP Level 3 says multiple CSP headers are all enforced. I updated the CSP note to explain that a proxy-defined CSP should be paired with Portainer's `--no-csp` flag if the proxy is intended to be authoritative.
- The post said Portainer requires `'unsafe-inline'` and `'unsafe-eval'` for scripts because of an AngularJS frontend. Current Portainer's built-in CSP does not allow either keyword. I removed them from the Nginx and Traefik CSP examples and replaced them with the current upstream allowances Portainer uses for HubSpot and Google reCAPTCHA.
- The custom CSP examples were missing the third-party sources present in Portainer's built-in CSP. I added the required `script-src` and `frame-src` entries for `js.hsforms.net`, `www.google.com/recaptcha/`, and `www.gstatic.com/recaptcha/` so the replacement CSP is aligned with current Portainer behavior.
- The post recommended `X-XSS-Protection` / Traefik `browserXssFilter` as part of the baseline. MDN marks `X-XSS-Protection` as deprecated, non-standard, and potentially able to introduce XSS issues, so I removed it from both examples.
- The inline comment for `Referrer-Policy: strict-origin-when-cross-origin` was inaccurate. I corrected the wording to match the actual header behavior.

## Review Notes
- Portainer documents `--trusted-origins` for deployments behind reverse proxies that encounter `Origin invalid` CSRF errors. The post does not cover that case, but it can matter in some reverse-proxy setups.
- Portainer's built-in CSP is implementation-specific and may change across releases. If a team disables it and manages CSP entirely at the proxy, the policy should be revalidated during Portainer upgrades.
