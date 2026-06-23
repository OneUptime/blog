# Validation Summary: How to Use MetalLB with Traefik Ingress

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MetalLB
- Traefik Proxy and Traefik Helm chart
- Kubernetes Services, IngressRoute CRDs, Middleware CRDs, TLSOption CRDs, and ServersTransport CRDs
- Helm
- Let's Encrypt ACME challenges
- Cloudflare DNS-01 credentials
- Prometheus metrics and OpenTelemetry tracing

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation, including specific IP annotations and traffic policies: https://metallb.io/usage/
- Traefik Helm chart `Chart.yaml` and current Kubernetes requirement: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/Chart.yaml
- Traefik Helm chart current `values.yaml`: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- Traefik Kubernetes CRD definitions for IngressRoute, Middleware, ServersTransport, TLSOption, TraefikService, TCP, and UDP resources: https://github.com/traefik/traefik/blob/v3.5/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik HTTP router rules and priority documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Lego Cloudflare DNS provider documentation used by Traefik ACME DNS-01: https://go-acme.github.io/lego/dns/cloudflare/

## Issues Found
- Updated the Kubernetes prerequisite from v1.21+ to v1.25+ because the current Traefik Helm chart requires Kubernetes >=1.25.0.
- Replaced outdated Traefik Helm chart values (`globalArguments`, `service.type`, top-level port `tls`, `redirectTo`, and `logs.access`) with current chart values (`global`, `api`, `service.spec.type`, `ports.*.http.tls`, `ports.web.http.redirections.entryPoint`, `log`, and `accessLog`).
- Replaced the old MetalLB annotation `metallb.universe.tf/loadBalancerIPs` with the current `metallb.io/loadBalancerIPs` annotation.
- Removed `allowCrossNamespace` from the Kubernetes Ingress provider example because it is not a current `providers.kubernetesIngress` chart value; retained it for the Kubernetes CRD provider where it is valid.
- Corrected the Traefik v3 route matcher from `Headers(...)` to `Header(...)`.
- Fixed the BasicAuth secret command so `kubectl --from-literal` receives htpasswd-formatted credentials directly instead of implying base64-encoded input.
- Converted ACME examples from CLI-only `additionalArguments` to current structured `certificatesResolvers` Helm values.
- Added the required single-replica caveat for Traefik Proxy's built-in ACME file storage and noted cert-manager or Traefik Enterprise for HA certificate management.
- Removed wildcard SAN usage from the TLS-ALPN example because Let's Encrypt wildcard certificates require DNS-01.
- Updated the Cloudflare DNS-01 example to use `CF_DNS_API_TOKEN`, a scoped API token credential supported by Lego.
- Added a `ServersTransport` resource before referencing `serversTransport: skip-verify` in the backend HTTPS example.
- Updated the tracing example from removed Jaeger-specific chart values to current OTLP tracing values.
- Corrected Layer 2 MetalLB diagrams and traffic-flow text to show one active speaker handling a VIP at a time rather than all speakers forwarding the VIP simultaneously.

## Review Notes
The post is now aligned with current Traefik v3 / Helm chart 41.x syntax and MetalLB's current CRD-based configuration model. Some examples still use placeholder services, domains, and IP addresses that readers must adapt to their own cluster and DNS environment.
