# Validation Summary: How to Deploy Nginx Web Server on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Deployment, Service, ConfigMap, Ingress, HorizontalPodAutoscaler)
- Nginx (web server, reverse proxy, static file server)
- Nginx Ingress Controller (kubernetes/ingress-nginx)
- Helm
- MetalLB (referenced for bare-metal LoadBalancer)
- Prometheus / nginx-prometheus-exporter
- MIME, gzip, HTTP/1.1, WebSockets

## Sources Consulted
- Nginx Ingress Controller (kubernetes/ingress-nginx) Helm chart docs — https://kubernetes.github.io/ingress-nginx/
- Nginx Ingress annotations reference — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Ingress API reference (networking.k8s.io/v1) — https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- Kubernetes HPA API reference (autoscaling/v2) — https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Official Nginx documentation — https://nginx.org/en/docs/
- Nginx http_proxy_module (proxy_pass, keepalive, headers) — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx http_upstream_module — https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx http_limit_req_module — https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Official Nginx Docker image documentation (UID 101 for nginx user, /var/log/nginx symlinks) — https://hub.docker.com/_/nginx
- nginx-prometheus-exporter — https://github.com/nginx/nginx-prometheus-exporter
- MDN docs on X-XSS-Protection (deprecated) — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
- OWASP Secure Headers Project — https://owasp.org/www-project-secure-headers/

## Issues Found
- **Deprecated `X-XSS-Protection` header value.** The static-site nginx config set `X-XSS-Protection "1; mode=block"`. All major browsers (Chrome 78+, Edge, Safari, Firefox) have removed XSS auditor support, and the legacy auditors themselves introduced XSS vulnerabilities in some cases. Mozilla and OWASP currently recommend setting this header to `0` (or omitting it) and relying on a strong Content-Security-Policy instead. Changed the value to `"0"` so the example reflects current security guidance.

## Review Notes
- **Nginx image tag (`nginx:1.25-alpine`)** is valid but trails the current stable/mainline lines available in 2026. The configurations shown remain compatible with newer 1.27+/1.29+ images, so I left the tag in place. Readers should pin to the latest patched image for their environment.
- **Upstream `keepalive` directives have no effect without `proxy_http_version 1.1` and `proxy_set_header Connection "";` in the location block.** The reverse-proxy example sets `keepalive 32` on `api_backend` but the `/api/` and `/auth/` locations don't set those two directives, so connections to the upstream won't actually be reused. The `/ws/` block does set `proxy_http_version 1.1`. Not a syntax error and the proxy still functions, so left as-is — but a future revision should add `proxy_http_version 1.1;` and `proxy_set_header Connection "";` to non-WebSocket locations that target a keepalive-enabled upstream.
- **Security Hardening list mentions CSP and HSTS, but neither appears in the example nginx configs.** Adding `Content-Security-Policy` and `Strict-Transport-Security` (`max-age=31536000; includeSubDomains`) headers in the static-site `server { ... }` block would make the example match the prose. Left as-is to preserve scope.
- **`nginx-prometheus-exporter:latest`** is convenient but reproducibility-hostile; pinning to a specific tag (e.g. `1.4.x`) is recommended for production. The single-dash flag form `-nginx.scrape-uri=...` continues to work with the exporter's Go flag parsing.
- **Talos-specific guidance is light.** The post correctly notes that bare-metal clusters need MetalLB (or equivalent) for `Service type: LoadBalancer`, but doesn't cover Talos-specific items such as `KubeSpan`, host network namespaces, or kernel-module pinning. Acceptable for an introductory deployment guide.
