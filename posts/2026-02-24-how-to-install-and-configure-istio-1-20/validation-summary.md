# Validation Summary: How to Install and Configure Istio 1.20

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio 1.20
- Kubernetes
- kubectl
- istioctl
- IstioOperator
- Istio Gateway
- PeerAuthentication and mTLS
- Istio Telemetry API
- Prometheus, Grafana, Kiali, and Jaeger

## Sources Consulted
- Istio 1.20 release announcement: https://istio.io/latest/news/releases/1.20.x/announcing-1.20/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Telemetry API documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio tracing with Telemetry API documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio 1.20 CRD manifests: https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/charts/base/crds/crd-all.gen.yaml
- Kubernetes kubectl version reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Istio 1.20.0 `istioctl` CLI help and manifest validation from the official release binary.

## Issues Found
- `kubectl version --short` uses a flag that is not present in modern kubectl reference output and was removed from Kubernetes clients in the 1.28 era. Changed it to `kubectl version`.
- The post said the ingress example created a Gateway and VirtualService, but the snippet only defines a Gateway. Changed the wording to "Set up a basic Gateway."
- The Bookinfo connectivity command only read `.status.loadBalancer.ingress[0].ip`, which fails on load balancers that expose a hostname. Added a hostname fallback.
- Istio 1.20 is no longer actively supported as of May 21, 2026. Added a short caveat that the guide is for legacy clusters or test environments.

## Review Notes
The IstioOperator, Gateway, PeerAuthentication, and Telemetry snippets were checked against Istio 1.20.0 tooling and CRDs. `telemetry.istio.io/v1alpha1` is valid for Istio 1.20 even though newer Istio documentation now shows `telemetry.istio.io/v1`.
