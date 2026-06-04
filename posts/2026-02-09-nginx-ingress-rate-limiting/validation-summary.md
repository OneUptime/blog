# Validation Summary: How to Implement NGINX Ingress Rate Limiting per Client IP and URL Path

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx / NGINX Ingress Controller
- NGINX request and connection rate limiting
- Prometheus metrics
- kubectl

## Sources Consulted
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- ingress-nginx configuration snippets documentation: https://kubernetes.github.io/ingress-nginx/examples/customization/configuration-snippets/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- NGINX ngx_http_limit_req_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html

## Issues Found
- The post implied that rejected ingress-nginx rate-limited requests return 429 by default. ingress-nginx defaults rejected request and connection limits to 503 unless the controller ConfigMap changes `limit-req-status-code` or NGINX snippets set `limit_req_status`, so the text and test command were corrected.
- The basic Ingress example used `nginx.ingress.kubernetes.io/limit-whitelist: ""` under a comment saying it returns 429. That annotation is for excluding client source ranges from rate limiting, so it was removed from the basic example.
- The whitelist example used a bare single IP for a source range. It was changed to `192.168.1.100/32` so the value is an explicit CIDR range.
- The burst example used `nginx.ingress.kubernetes.io/limit-rate-after: "0"` as if it controlled request burst delay. That annotation controls response transmission rate limiting and requires proxy buffering, so it was removed.
- The custom snippet placed `limit_req_zone` inside `configuration-snippet`. ingress-nginx `configuration-snippet` is inserted into the NGINX location context, but `limit_req_zone` is only valid in the NGINX `http` context. The example now defines the zone in the controller ConfigMap `http-snippet` and references it from the Ingress `configuration-snippet`.
- The examples used the older `kubernetes.io/ingress.class` annotation. Kubernetes documentation recommends the `spec.ingressClassName` field for newly created Ingress resources, so the examples were updated.
- The metrics example searched for `nginx_http_limit`, which is not an ingress-nginx exposed metric documented for Prometheus. It now filters the documented `nginx_ingress_controller_requests` metric by rejected status.
- The post did not mention that ingress-nginx rate limits apply per controller replica. The explanation and comments were updated to prevent underestimating the effective limit in multi-replica deployments.

## Review Notes
The `limit-whitelist` annotation is still documented by ingress-nginx, but naming may vary in newer risk documentation that also references allowlist terminology. Snippet annotations can be disabled by cluster policy and are risky in multi-tenant clusters, so the corrected example enables them explicitly in the controller ConfigMap.
