# Validation Summary: How to Use K3s with Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Traefik Proxy
- Kubernetes IngressRoute CRDs
- Kubernetes Services, Deployments, Secrets, and probes
- TLS and cert-manager
- Traefik middleware
- TCP and UDP routing
- OneUptime monitoring

## Sources Consulted
- K3s Networking Services documentation: https://docs.k3s.io/networking/networking-services
- K3s Managing Packaged Components documentation: https://docs.k3s.io/installation/packaged-components
- K3s Helm Controller documentation: https://docs.k3s.io/add-ons/helm
- Traefik Kubernetes IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Kubernetes IngressRouteTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik Kubernetes IngressRouteUDP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/udp/ingressrouteudp/
- Traefik v2 to v3 migration documentation: https://doc.traefik.io/traefik/v3.4/migrate/v2/
- Traefik IPAllowList middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ipallowlist/
- Traefik RateLimit middleware documentation: https://doc.traefik.io/traefik/middlewares/http/ratelimit/
- Traefik Compress middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/compress/
- Traefik routing rules and priority documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/

## Issues Found
- Updated the K3s bundled Traefik version claim from Traefik v2 to Traefik v3 and changed the deployment description from DaemonSet to Helm-managed Deployment, matching current K3s documentation.
- Changed dashboard port-forwarding from port 9000 to port 8080 and clarified that the dashboard IngressRoute must be enabled first, matching the current Traefik Helm chart examples.
- Replaced the deprecated `traefik.containo.us/v1alpha1` API group with `traefik.io/v1alpha1` throughout all Traefik CRD examples.
- Replaced deprecated `ipWhiteList` middleware configuration and "whitelist" naming with current `ipAllowList` / allowlist terminology.
- Changed the header routing matcher from deprecated/old `Headers(...)` syntax to current `Header(...)` syntax.
- Updated the cert-manager HTTP-01 solver from legacy `class: traefik` to recommended `ingressClassName: traefik`.
- Updated the Traefik Helm access log values from `logs.access` to `accessLog`, matching current chart values.
- Added explicit `expose.default: true` to custom TCP and UDP entrypoint examples so the added ports are exposed by the Traefik Service.
- Corrected the rate-limit `ipStrategy.depth: 1` comment to say it uses the rightmost `X-Forwarded-For` IP.
- Changed the nginx production example probes from `/health` and `/ready` to `/`, because the stock `nginx:alpine` image does not serve those custom health endpoints by default.

## Review Notes
The examples are now aligned with current Traefik v3 CRDs and K3s documentation. Operators using older K3s releases should still check the Traefik chart version included with their specific K3s release before applying HelmChartConfig values.
