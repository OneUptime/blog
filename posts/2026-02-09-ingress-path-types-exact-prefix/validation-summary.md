# Validation Summary: How to Use Kubernetes Ingress Path Types: Exact, Prefix,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes `networking.k8s.io/v1` API
- ingress-nginx controller
- Traefik Kubernetes Ingress provider
- NGINX path matching and rewrite annotations
- `kubectl`
- `curl`

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/

## Issues Found
- The post said ingress-nginx `ImplementationSpecific` uses regex matching. I changed this to say it can be used with regex matching when regex support is enabled, because ingress-nginx requires `nginx.ingress.kubernetes.io/use-regex: "true"` for regex paths.
- The mixed path type section described a fixed processing order of Exact, then Prefix, then ImplementationSpecific. I changed this to Kubernetes' documented matching precedence: longest matching path first, then Exact over Prefix when path lengths tie, with ImplementationSpecific behavior left to the controller.
- The ingress-nginx rewrite example used a regex path and `$2` capture group without setting `nginx.ingress.kubernetes.io/use-regex: "true"`. I added the annotation to match the official ingress-nginx rewrite example.
- The ingress-nginx debug commands used brittle placeholder pod names and an older ConfigMap name. I updated them to target `deploy/ingress-nginx-controller` and the commonly used `ingress-nginx-controller` ConfigMap.
- The command intended to list all paths only inspected `.spec.rules[0]`. I replaced it with a `jsonpath` command that iterates through all Ingress rules and paths.

## Review Notes
- The Kubernetes Ingress examples use the current `networking.k8s.io/v1` API and explicit `pathType` fields.
- The Traefik section is technically plausible for Kubernetes Ingress routing and middleware annotations, but Traefik-specific advanced matching is controller behavior rather than portable Kubernetes Ingress behavior.
