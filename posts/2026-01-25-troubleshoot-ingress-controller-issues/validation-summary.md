# Validation Summary: How to Troubleshoot Ingress Controller Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes Secrets and TLS
- kubectl
- NGINX Ingress Controller
- OpenSSL

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation, including ExternalName and EndpointSlices notes: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes v1.33 Endpoints deprecation note: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes TLS Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- ingress-nginx rewrite example: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx annotations documentation: https://github.com/kubernetes/ingress-nginx/blob/main/docs/user-guide/nginx-configuration/annotations.md

## Issues Found
- The post used `kubectl get endpoints` for backend health checks. The legacy Endpoints API is deprecated as of Kubernetes v1.33, so those checks were changed to `kubectl get endpointslices -n production -l kubernetes.io/service-name=my-app-svc`.
- The temporary debug pod commands used `kubectl run` without `--restart=Never`. Since `kubectl run` defaults to `--restart=Always`, the examples were updated to include `--restart=Never` for one-off connectivity tests.
- The regex rewrite example used `rewrite-target: /$2` with a regex path but did not set `nginx.ingress.kubernetes.io/use-regex: "true"`. Added the annotation to match ingress-nginx's documented regex rewrite pattern.
- The annotation comments described `proxy-http-version` and `upstream-hash-by` as enabling WebSocket support. ingress-nginx defaults proxy HTTP version to 1.1, and `upstream-hash-by` configures consistent upstream hashing, so the comments were corrected.
- The ExternalName Service example intended for cross-namespace routing did not expose a Service port. Added a `ports` entry so it can be referenced by an Ingress backend port.

## Review Notes
The Kubernetes Ingress API is stable but frozen; Kubernetes recommends Gateway API for newer feature development. The article remains technically relevant because Ingress and ingress-nginx are still widely used and supported.
