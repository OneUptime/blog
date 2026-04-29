# Validation Summary: How to Configure K3s Traefik IngressRoute

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Traefik Proxy
- Traefik `IngressRoute` CRDs
- Traefik `Middleware`
- Traefik `TraefikService`
- TLS and ACME
- gRPC
- TCP routing

## Sources Consulted
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- Traefik IngressRoute reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Kubernetes Service reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/service/
- Traefik TraefikService reference: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik IngressRouteTCP reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik Headers middleware reference: https://doc.traefik.io/traefik/master/reference/routing-configuration/http/middlewares/headers/
- Traefik RedirectScheme middleware reference: https://doc.traefik.io/traefik/v3.4/middlewares/http/redirectscheme/
- Traefik gRPC/HTTP2 overview: https://doc.traefik.io/traefik/master/expose/overview/
- Traefik v2 to v3 migration details: https://doc.traefik.io/traefik/master/migrate/v2-to-v3-details/
- kubectl create secret generic: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post used the removed `traefik.containo.us/v1alpha1` API group throughout. I updated the CRD API group and the example CRD names to `traefik.io/v1alpha1` / `*.traefik.io`, which is required for current K3s releases that bundle Traefik v3.
- The weighted canary example attached `weight` directly to multiple backend Services inside a single `IngressRoute`. I replaced it with a `TraefikService` weighted round-robin example and an `IngressRoute` that references that `TraefikService`, which matches Traefik's documented pattern for weighted service routing.
- The `security-headers` example used `headers.sslRedirect`, which Traefik deprecated in favor of entrypoint redirection or the `RedirectScheme` middleware. I removed the deprecated field and left HTTPS redirection to the dedicated `redirectScheme` middleware example.
- The `certResolver` example implied the resolver name was ready to use as-is. I clarified that the referenced resolver must already be configured in Traefik.
- The TCP example already noted a custom entrypoint, but for K3s this also needs to be exposed by Traefik. I clarified that in the inline comment.

## Review Notes
- Current Traefik reference pages and Helm examples still show `traefik.io/v1alpha1`, but Traefik's deprecation notices indicate a future move to `traefik.io/v1`. This post is accurate against the current docs, but it should be rechecked on a future Traefik major upgrade.
- The `apt-get install -y apache2-utils` command is Debian/Ubuntu-specific. The `htpasswd` and `kubectl create secret generic --from-file=users=auth.txt` pattern itself is valid.
