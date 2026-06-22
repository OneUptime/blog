# Validation Summary: How to Implement Traffic Mirroring in Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy
- Traefik Kubernetes CRD provider
- TraefikService mirroring
- Kubernetes Services and IngressRoute
- Prometheus metrics and PrometheusRule alerts

## Sources Consulted
- Traefik Kubernetes CRD TraefikService documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik HTTP service mirroring documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/#mirroring
- Traefik Kubernetes CRD provider documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/kubernetes/kubernetes-crd/
- Traefik metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Traefik v3.5 CRD definition: https://raw.githubusercontent.com/traefik/traefik/v3.5/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

## Issues Found
- The cross-namespace example said cross-namespace mirroring requires ExternalName services. Traefik CRD service references support a `namespace` field, while cross-namespace references require `providers.kubernetesCRD.allowCrossNamespace`. I removed the ExternalName workaround from the example, referenced `staging-api` with `namespace: staging`, and added the required provider setting note.
- The Prometheus examples used `@kubernetes` service label values. The examples in this post use `IngressRoute` and `TraefikService` from the Kubernetes CRD provider, so the provider suffix should be `@kubernetescrd`. I changed the selectors to regexes ending in `@kubernetescrd` because Traefik may include generated service names for CRD-backed services.

## Review Notes
Traefik's mirroring options `mirrors`, `percent`, `mirrorBody`, and `maxBodySize` were checked against the current CRD and service documentation. The post's `maxBodySize` behavior and Prometheus metric names are consistent with the official documentation.
