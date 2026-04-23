# Validation Summary: How to Reduce Rancher UI Load Time - Reduce Load Time

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- NGINX
- HTTP/2
- CDN
- Cloudflare
- WebSockets
- Browser performance tooling

## Sources Consulted
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/v2.12/getting-started/installation-and-upgrade/installation-requirements
- Rancher user preferences: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/user-settings/user-preferences
- Rancher access clusters / Rancher CLI: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Rancher CLI reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cli-with-rancher/rancher-cli
- Rancher Layer 7 NGINX load balancer guidance: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/configure-layer-7-nginx-load-balancer
- Rancher Helm chart options, external TLS termination: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher tuning and best practices at scale: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/best-practices/rancher-server/tuning-and-best-practices-for-rancher-at-scale
- Rancher UI server-side pagination: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/ui-server-side-pagination
- Rancher Dashboard repository: https://github.com/rancher/dashboard
- NGINX proxy module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX gzip module: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- NGINX HTTP/2 module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX 1.25.1 changes: https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html
- NGINX SSL module: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- curl HTTP/2 documentation: https://everything.curl.dev/http/versions/http2.html
- Cloudflare Full (strict) mode: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Cloudflare cache rules settings: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- Cloudflare default cache behavior: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- Cloudflare content compression: https://developers.cloudflare.com/speed/optimization/content/compression/
- Cloudflare HTTP/3: https://developers.cloudflare.com/speed/optimization/protocol/http3/
- Cloudflare Argo Smart Routing: https://developers.cloudflare.com/argo-smart-routing/

## Issues Found
- The NGINX example used `listen 443 ssl http2;`, but current NGINX documents the separate `http2 on;` directive and deprecates the `http2` parameter on `listen`. I updated the snippet accordingly.
- The NGINX example used `proxy_cache rancher-static-cache;` without defining a cache zone. I added a `proxy_cache_path` directive in the proper `http` context so the configuration is valid.
- The reverse-proxy example omitted Rancher’s documented Layer 7 proxy requirements: forwarded headers, WebSocket upgrade handling, and longer read timeouts. I added `X-Forwarded-*` headers, `Upgrade`/`Connection` handling, `proxy_http_version 1.1`, `proxy_read_timeout`, and `proxy_buffering off`.
- The proxy example sent traffic to an HTTPS upstream without documenting the extra proxy SSL requirements. I changed it to the Rancher-documented HTTP upstream pattern used when TLS is terminated externally.
- The landing-page section made a stronger claim than the docs support about how the home page loads cluster summaries. I rewrote it to the documented user preference: setting a specific cluster as the login landing page.
- The CDN section was too broad and could be read as caching all Rancher traffic. I narrowed it to caching static UI assets only and explicitly bypassing API, auth, and WebSocket traffic.
- The browser recommendation claimed Chrome or Edge were best because of V8. Rancher’s docs say the UI works best in Firefox or Chromium-based browsers, so I corrected that recommendation.
- The DevTools section included an unsupported absolute target (`DOMContentLoaded < 3s`). I changed it to a before/after comparison metric.
- The conclusion overstated HTTP/2 and compression effects. I replaced “eliminates request queuing” and the precise `60-70%` claim with wording aligned to the underlying protocol and NGINX documentation.

## Review Notes
- Rancher currently documents external Layer 4 load balancing as the general recommendation, while allowing external Layer 7 termination when the proxy is configured correctly. The post is now accurate for that Layer 7 case.
- Rancher also documents UI server-side pagination as a significant UI performance feature for high-count resource lists. The post does not cover it, but that omission does not make the corrected content inaccurate.
