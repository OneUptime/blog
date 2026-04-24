# Validation Summary: How to Configure Content-Security-Policy Headers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Nginx
- Traefik
- HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`)
- Docker
- OWASP ZAP
- Nikto

## Sources Consulted
- Portainer reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy
- Portainer nginx reverse proxy docs: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer Traefik reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer FAQ on built-in CSP / iframe blocking: https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-doesnt-the-portainer-ui-load-inside-an-iframe
- Portainer SSL certificate docs: https://docs.portainer.io/advanced/ssl
- Portainer source for current secure-header behavior: https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go
- Portainer source for current CLI flags and deprecations: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source tests covering deprecated SSL flags: https://github.com/portainer/portainer/blob/develop/api/cli/cli_test.go
- Nginx `ngx_http_headers_module`: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_v2_module`: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Traefik headers middleware docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik HTTP service docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik ServersTransport docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/serverstransport/
- MDN CSP header reference, including multiple enforced policies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN `X-XSS-Protection` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- ZAP Docker guide: https://www.zaproxy.org/docs/docker/about/
- ZAP baseline scan docs: https://www.zaproxy.org/docs/docker/baseline-scan/
- Nikto project/docs: https://github.com/sullo/nikto

## Issues Found
- The post instructed readers to add a proxy-side CSP without noting that Portainer already serves its own CSP by default. I corrected the article to explain Portainer's built-in CSP and the need to avoid stacking multiple enforced CSP headers unless Portainer CSP is disabled first.
- The Nginx example used deprecated `listen 443 ssl http2;` syntax. I updated it to `listen 443 ssl;` with `http2 on;`, which matches current Nginx documentation.
- The Nginx example attempted to remove `X-Powered-By` with `add_header X-Powered-By ""`, which does not hide an upstream header. I replaced this with `proxy_hide_header X-Powered-By;`.
- The original Portainer-specific CSP block was inaccurate for current Portainer behavior and also embedded `#` comments inside the quoted Nginx header value, which would have been sent as part of the header and invalidated the policy. I replaced that section with current, verified guidance.
- The Traefik example set `browserXssFilter: true`, which adds the deprecated `X-XSS-Protection` header. I removed it.
- The Traefik example proxied to `https://portainer:9443` without any `serversTransport` configuration. With Traefik's default backend certificate verification, that is not a reliable default for Portainer's self-signed upstream. I changed the backend URL to `http://portainer:9000`, which matches Portainer's reverse proxy guidance.
- The verification example's expected CSP output no longer matched current Portainer behavior. I updated it to reflect Portainer's built-in CSP.
- The securityheaders.com line referred to an API even though the example was just fetching the site URL. I corrected that wording.
- The ZAP example used the older `owasp/zap2docker-stable` image and wrote a report file into an ephemeral container filesystem. I updated it to the current ZAP stable image and added the documented volume mount so the report is preserved.
- The direct Portainer example used deprecated `--ssl`, `--sslcert`, and `--sslkey` guidance and referenced certificate files without mounting them into the container. I updated the example to mount `/certs` and use the current `--tlsverify`, `--tlscert`, and `--tlskey` flags.

## Review Notes
- Portainer's own published SSL-certificate docs still show `--sslcert` and `--sslkey`, but the current Portainer source marks those flags as deprecated aliases and prefers `--tlscert` and `--tlskey`.
- The Nginx example still proxies to Portainer over `https://localhost:9443`, which works with Nginx defaults because upstream certificate verification is off unless explicitly enabled. If stronger backend TLS verification is desired, administrators should also configure `proxy_ssl_trusted_certificate` and `proxy_ssl_verify on`.
- Portainer's built-in CSP sources can change between releases, so examples that hard-code a replacement CSP should be revalidated whenever Portainer is upgraded.
