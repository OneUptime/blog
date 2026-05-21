# Validation Summary: How to Use Kubernetes Custom Resources with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes Custom Resource Definitions
- Istio networking APIs: VirtualService, DestinationRule, Gateway, ServiceEntry, Sidecar
- Istio security APIs: PeerAuthentication, AuthorizationPolicy, RequestAuthentication
- Istio Telemetry API
- kubectl
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio CRD manifest for release 1.29: https://raw.githubusercontent.com/istio/istio/release-1.29/manifests/charts/base/files/crd-all.gen.yaml

## Issues Found
- The post said Istio registers "dozens" of CRDs. The current standard Istio CRD manifest contains more than a dozen Istio CRDs, not multiple dozens, so this was changed to "a set of CRDs."
- The Sidecar explanation implied sidecars would "only" receive configuration for the listed services without clarifying the scope of the feature. Istio's Sidecar resource scopes generated proxy configuration but is not an outbound access control policy, so the wording was corrected.
- The validation section described `istioctl analyze -n my-namespace` as offline validation. That command analyzes live cluster state. The post now describes it as live-cluster analysis and uses `istioctl analyze --use-kube=false my-config.yaml` for offline file analysis.
- The namespace scoping explanation said namespace-scoped Istio resources affect workloads in their namespace. That is too broad for resources such as VirtualService and DestinationRule, whose visibility and effect depend on fields such as `hosts`, `gateways`, `exportTo`, and selectors. The wording was corrected.

## Review Notes
The YAML examples use current Istio API groups and versions for the resources shown. Several examples assume matching Kubernetes Services, workloads, subset labels, gateway deployments, TLS secrets, and telemetry providers already exist; that is normal for focused Istio resource examples but would need to be called out in a production tutorial.
