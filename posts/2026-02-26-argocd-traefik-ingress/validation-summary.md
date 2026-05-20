# Validation Summary: How to Expose ArgoCD with Traefik Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- Traefik IngressRoute and IngressRouteTCP CRDs
- Traefik HTTP middleware
- Helm
- Let's Encrypt ACME certificate resolvers
- gRPC and h2c backend routing

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Traefik IngressRoute CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik IngressRouteTCP CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik HTTP router rules and priority documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik Kubernetes CRD provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/kubernetes/kubernetes-crd/
- Traefik IPAllowList middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ipallowlist/
- Traefik RateLimit middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ratelimit/
- Traefik RedirectScheme middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/redirectscheme/
- Traefik Helm installation documentation: https://doc.traefik.io/traefik/getting-started/install-traefik/
- K3s networking services documentation: https://docs.k3s.io/networking/networking-services

## Issues Found
- The IngressRoute gRPC matcher used `Headers(...)`, but current Traefik documentation and Argo CD's official Traefik example use the singular `Header(...)` matcher. Changed it to ``Header(`Content-Type`, `application/grpc`)`` so Traefik can parse the rule.
- The verification command used `argocd login argocd.example.com --grpc-web` under "Test CLI login with gRPC". The shown IngressRoute config is for native gRPC over HTTP/2 with an h2c backend, and Argo CD's official Traefik example tests with a normal `argocd login <host>`. Changed the command to `argocd login argocd.example.com`.

## Review Notes
- The Traefik CRD API group `traefik.io/v1alpha1`, `IngressRoute`, `IngressRouteTCP`, `Middleware`, `ipAllowList`, `rateLimit`, `redirectScheme`, `tls.certResolver`, and `tls.passthrough` fields match current Traefik documentation.
- The Argo CD `server.insecure: "true"` setting for TLS termination at the edge matches the official Argo CD ingress guidance.
- K3s still deploys Traefik by default unless disabled, according to the current K3s networking documentation.
