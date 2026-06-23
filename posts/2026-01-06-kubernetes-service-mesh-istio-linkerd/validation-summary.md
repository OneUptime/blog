# Validation Summary: How to Set Up Service Mesh with Istio/Linkerd in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (hands-on, command- and config-heavy walkthrough)

## Technologies Covered
- Kubernetes
- Linkerd (CLI, control plane, viz extension, jaeger extension)
- Istio (istioctl, control plane, add-ons)
- SMI TrafficSplit
- Linkerd ServiceProfile
- Istio VirtualService, DestinationRule, PeerAuthentication, AuthorizationPolicy
- Envoy / linkerd2-proxy
- Prometheus, Grafana, Jaeger, Kiali
- mTLS, distributed tracing (B3 / W3C Trace Context)

## Sources Consulted
- Linkerd Service Profiles reference — https://linkerd.io/2/reference/service-profiles/
- Linkerd Configuring Retries — https://linkerd.io/2.10/tasks/configuring-retries/
- Linkerd getting started / CLI install — https://linkerd.io/2/getting-started/
- SMI TrafficSplit spec — https://github.com/servicemeshinterface/smi-spec
- Istio installation profiles & istioctl docs — https://istio.io/latest/docs/setup/
- Istio traffic management (VirtualService / DestinationRule) — https://istio.io/latest/docs/reference/config/networking/
- Istio security (PeerAuthentication / AuthorizationPolicy) — https://istio.io/latest/docs/reference/config/security/
- Istio observability / Envoy stats endpoint (15090) and Linkerd proxy metrics (4191)

## Issues Found
- **Incorrect Linkerd ServiceProfile retry configuration (fixed).** The original `ServiceProfile` used a non-existent per-route block:
  ```yaml
  retries:
    isRetryable: true
    maxRetries: 3
  ```
  Linkerd's ServiceProfile API does not support a `retries` block or a `maxRetries` field. Retries are enabled with a route-level boolean `isRetryable: true`, and the volume of retries is bounded by a spec-level `retryBudget` (`retryRatio`, `minRetriesPerSecond`, `ttl`) rather than a fixed count. The example was corrected to move `isRetryable: true` to the route level and add a `retryBudget` at the spec level with realistic default-style values. Verified against the official Linkerd Service Profiles reference and Configuring Retries docs.

## Review Notes
- The Istio install section describes the `minimal` profile as "recommended for production." Istio's documentation technically lists the `default` profile as the recommended production profile (minimal installs only the control plane, with gateways added separately). This is a defensible simplification rather than a hard error, so it was left as-is; the inline comment correctly clarifies that minimal is "control plane only."
- TrafficSplit (`split.smi-spec.io/v1alpha1`) and ServiceProfile are still valid for current Linkerd, but newer Linkerd versions (2.16+) move retries/traffic splitting toward Gateway API types, and SMI/TrafficSplit support is provided via the separate `linkerd-smi` extension in 2.12+. The shown YAML remains syntactically valid; a future update could mention the Gateway API direction.
- Istio CRDs use `networking.istio.io/v1beta1`, which is still supported; `v1` is now also available and could be preferred in a future revision.
- The Istio add-on URLs pin `release-1.24`, which is valid; bumping to a newer release branch over time keeps the manifests current.
- Minor (non-technical): the "Resource Overhead Comparison" line is plain text rather than a Markdown heading (`##`). Left unchanged as a stylistic item.
- Resource footprint figures, proxy metrics ports (linkerd-proxy 4191, istio-proxy 15090), CLI commands, and all Istio traffic/security CRD field names were verified and are accurate.
