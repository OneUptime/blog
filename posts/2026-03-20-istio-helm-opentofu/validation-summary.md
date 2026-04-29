# Validation Summary: How to Deploy Istio Service Mesh on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- OpenTofu
- Helm
- Mutual TLS (mTLS)
- Istio Gateway
- Istio VirtualService
- Istio PeerAuthentication
- Istio AuthorizationPolicy

## Sources Consulted
- Istio Helm installation guide: https://istio.io/latest/docs/setup/install/helm/
- Istio sidecar injection guide: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy API reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio mesh configuration reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio tracing with Telemetry API task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio `base` chart defaults for 1.29.2: https://raw.githubusercontent.com/istio/istio/1.29.2/manifests/charts/base/values.yaml
- Istio `istiod` chart docs and values for 1.29.2: https://raw.githubusercontent.com/istio/istio/1.29.2/manifests/charts/istio-control/istio-discovery/README.md
- Istio `istiod` chart values for 1.29.2: https://raw.githubusercontent.com/istio/istio/1.29.2/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio `gateway` chart values for 1.29.2: https://raw.githubusercontent.com/istio/istio/1.29.2/manifests/charts/gateway/values.yaml

## Issues Found
- The post pinned all Istio Helm charts to `1.20.0`, which is outdated relative to the current Istio Helm install docs on 2026-04-29. I updated the chart versions to `1.29.2` to match the current stable documentation.
- The base chart example omitted `defaultRevision=default`, which the current Helm install guide calls out for validation to function correctly in the default revision install flow. I added the corresponding `set` block to `helm_release.istio_base`.
- The `istiod` values used the older `pilot.*` nesting. In the current `istiod` chart, autoscaling and resource settings are chart-level values, so I flattened those keys to `autoscaleMin`, `autoscaleMax`, and `resources`.
- The snippet attempted to enforce strict mTLS with `meshConfig.mtls.mode`, which is not a valid mesh config field. I replaced that with `enableAutoMtls = true` and left strict enforcement to the existing `PeerAuthentication` resource.
- The tracing example used the older inline Zipkin address under `defaultConfig.tracing`. I updated it to the current extension-provider plus `Telemetry` API model, which is how current Istio docs configure tracing backends and mesh-wide sampling.
- The Istio resources used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. I updated them to the current supported `v1` API versions shown in the official references.
- The overview and summary overstated automatic mTLS as applying to all service-to-service communication. I narrowed that wording to communication between workloads in the mesh, which is the technically correct scope.

## Review Notes
- The post is now technically correct against current Istio sidecar-mode documentation as of 2026-04-29.
- The post now follows the current tracing pattern of defining the backend in `meshConfig` and enabling/reporting traces with a `Telemetry` resource.
- Installing the ingress gateway in `istio-system` is valid, although current Istio examples often place gateways in a separate namespace such as `istio-ingress`.
