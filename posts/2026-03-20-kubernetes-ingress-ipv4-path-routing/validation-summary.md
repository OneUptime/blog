# Validation Summary: How to Set Up Kubernetes Ingress for IPv4 Path-Based Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Ingress API (`networking.k8s.io/v1`)
- ingress-nginx
- NGINX path matching and rewrites
- `kubectl`
- `curl`

## Sources Consulted
- Kubernetes Ingress concepts: https://kubernetes.io/docs/concepts/services-networking/ingress/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- ingress-nginx annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx rewrite example: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx controller behavior: https://kubernetes.github.io/ingress-nginx/how-it-works/

## Issues Found
- The basic path-based Ingress included `nginx.ingress.kubernetes.io/rewrite-target: /`, which would rewrite matching requests to `/` instead of preserving `/users`, `/products`, and `/orders`. I removed the annotation so the example matches its explanation.
- The rewrite example used a regex path with capture groups but omitted `nginx.ingress.kubernetes.io/use-regex: "true"`, which ingress-nginx documents for regex path matching. I added the annotation.
- The NGINX verification command selected the first pod in the namespace, which may not be the controller pod. I replaced it with `kubectl exec -n ingress-nginx deploy/ingress-nginx-controller -- nginx -T`, which uses documented `kubectl exec TYPE/NAME` syntax.
- The rate-limiting section said “per minute” while using `nginx.ingress.kubernetes.io/limit-rps`, which is requests per second, and it implied path-level scope even though ingress-nginx annotations apply to the entire Ingress object. I corrected the heading and comment to match the documented behavior.
- The rule-priority explanation was inaccurate. I updated it to match the Kubernetes Ingress spec and ingress-nginx behavior: longest match first, then `Exact` over `Prefix`, with ingress-nginx ordering paths by descending length before rendering NGINX locations.

## Review Notes
- The testing snippet assumes the ingress controller Service exposes an IPv4 address in `.status.loadBalancer.ingress[0].ip`.
- In ingress-nginx, using `rewrite-target` or `use-regex` on any Ingress for the same host can force regex-based location matching for all paths on that host.
