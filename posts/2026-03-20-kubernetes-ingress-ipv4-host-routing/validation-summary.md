# Validation Summary: How to Configure Kubernetes Ingress for IPv4 Host-Based Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Ingress API (`networking.k8s.io/v1`)
- ingress-nginx
- cert-manager
- `kubectl`
- HTTP Host-based routing
- TLS termination

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- ingress-nginx basic usage: https://kubernetes.github.io/ingress-nginx/user-guide/basic-usage/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- Kubernetes blog, "Ingress NGINX Retirement: What You Need to Know": https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/

## Issues Found
- The TLS example listed `api.example.com` under `spec.tls` but did not define a matching `rules.host`. I added the missing `api.example.com` rule because Kubernetes documents that `hosts` in the `tls` section should explicitly match hosts in the `rules` section.
- The wildcard section said `*.example.com` matches all subdomains. I corrected this to single-label wildcard matching and added an example, because Kubernetes wildcard hosts do not match `example.com` or deeper names such as `bar.foo.example.com`.

## Review Notes
- The post uses current `networking.k8s.io/v1` Ingress syntax and valid `pathType: Prefix` usage.
- The `INGRESS_IP=$(kubectl get svc ... -o jsonpath='{.status.loadBalancer.ingress[0].ip}')` example is appropriate for IPv4-focused environments that publish a load balancer IP. Some cloud providers publish a hostname instead of an IP in `.status.loadBalancer.ingress[0]`.
- Kubernetes recommends Gateway API for new feature development because the Ingress API is frozen, though existing Ingress usage remains supported.
- Official Kubernetes guidance states that Ingress NGINX entered retirement after March 2026, so existing deployments can continue to function but no further releases or bug fixes are expected.
