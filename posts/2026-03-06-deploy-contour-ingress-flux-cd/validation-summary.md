# Validation Summary: How to Deploy Contour Ingress with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, Kustomization, and Alert resources
- Contour ingress controller
- Envoy proxy
- Kubernetes Deployments, Services, ConfigMaps, Namespaces, and LoadBalancer Services
- Contour HTTPProxy, ExtensionService, route delegation, retries, health checks, traffic splitting, and rate limiting
- Envoy global rate limit service
- Prometheus Operator ServiceMonitor integration through the Bitnami Contour chart

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API and guide: https://fluxcd.io/flux/components/kustomize/api/v1/ and https://fluxcd.io/flux/components/kustomize/kustomizations/
- Bitnami Contour chart documentation and values: https://artifacthub.io/packages/helm/bitnami/contour and https://raw.githubusercontent.com/bitnami/charts/main/bitnami/contour/values.yaml
- Bitnami Contour chart templates for Envoy Deployment, DaemonSet, and HPA: https://github.com/bitnami/charts/tree/main/bitnami/contour/templates
- Contour configuration reference: https://projectcontour.io/docs/main/configuration/
- Contour HTTPProxy API reference: https://projectcontour.io/docs/main/config/api-reference/
- Contour rate limiting guide: https://projectcontour.io/docs/main/config/rate-limiting/
- Contour HTTPProxy inclusion/delegation documentation: https://projectcontour.io/docs/v1.6.1/httpproxy/
- Envoy rate limit service documentation: https://github.com/envoyproxy/ratelimit

## Issues Found
- The HelmRelease used `version: "18.x"`, while the current Bitnami chart line is 21.x. Updated the chart constraint to `21.x`.
- The Bitnami Contour chart expects `configInline` at the top level of `values`, not under `contour`. Moved the configuration block to the correct location.
- The Envoy HPA only renders when `envoy.kind` is `deployment`; the original snippet left Envoy as the chart default DaemonSet while enabling autoscaling. Added `envoy.kind: deployment` and updated the Flux health check from DaemonSet to Deployment.
- The Flux Kustomization used `wait: true` with explicit `healthChecks`, but Flux ignores `healthChecks` when `wait` is true. Changed it to `wait: false` so the listed health checks are used.
- The retry policy listed `retriableStatusCodes` without including `retriable-status-codes` in `retryOn`, so Contour would not honor those status codes. Added the required `retryOn` entry.
- The delegation example included an `admin-routes` child proxy that was never defined. Removed that include so the root proxy only references defined delegated proxies.
- Delegated child route prefixes repeated parent prefixes. Since Contour concatenates include and route prefixes, `/api` plus `/api/v1` would become `/api/api/v1`. Updated child route prefixes to be relative to the delegated prefix and adjusted the frontend child route accordingly.
- The rate limit deployment referenced a missing `ratelimit-config` ConfigMap and Redis Service, and used the mutable `master` image tag. Added a minimal ConfigMap and Redis Deployment/Service, pinned the rate limit image to `v1.4.0`, and set `RUNTIME_APPDIRECTORY`.
- The global rate limit comment implied that HTTPProxy alone defined the 1000 requests/minute limit. Updated it to clarify that the HTTPProxy emits a descriptor matched by the external rate limit service configuration.

## Review Notes
- The AWS LoadBalancer annotations are provider-specific and appropriate only for AWS clusters. Other environments should use their cloud provider's Service annotations or a LoadBalancer implementation such as MetalLB.
- The Redis example is intentionally minimal for the tutorial. Production rate limiting should use a resilient Redis deployment or managed Redis service.
