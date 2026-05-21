# Validation Summary: How to Migrate from Linkerd to Istio

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Istio
- Linkerd
- Kubernetes
- Service mesh migration
- mTLS and authorization policy
- Traffic routing and retries
- Observability tooling

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio sidecar injection guide: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Kiali integration: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio istioctl proxy-config reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd automatic mTLS: https://linkerd.io/2/features/automatic-mtls/
- Linkerd authorization policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Linkerd ServiceProfiles reference: https://linkerd.io/2/reference/service-profiles/
- Linkerd retries and timeouts: https://linkerd.io/2/features/retries-and-timeouts/
- Linkerd TrafficSplit feature page: https://linkerd.io/2/features/traffic-split/
- Linkerd Gateway API support: https://linkerd.io/2.16/features/gateway-api/
- Linkerd uninstall guide: https://linkerd.io/2-edge/tasks/uninstall/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- Corrected the cross-mesh mTLS explanation. Linkerd does not have an Istio-style PERMISSIVE mTLS mode; it requires mTLS between Linkerd-meshed pods but, by default, accepts plaintext from non-meshed clients unless policy blocks it.
- Clarified that both meshes should not be injected into the same pod, rather than implying Kubernetes makes it impossible.
- Updated Istio resources from `v1beta1` to the current `v1` API group versions for PeerAuthentication, VirtualService, DestinationRule, and AuthorizationPolicy examples.
- Updated the Linkerd ServerAuthorization example from `policy.linkerd.io/v1alpha1` to `policy.linkerd.io/v1beta1`.
- Added current-version caveats that Linkerd ServiceProfiles are superseded by Gateway API resources and that TrafficSplit/linkerd-smi is deprecated.
- Corrected the retry budget note. Current Istio supports retry budgets through DestinationRule `trafficPolicy.retryBudget`; circuit breaking is not a one-to-one approximation.
- Updated Istio addon URLs from the old `release-1.20` branch to the current Istio `release-1.30` examples used by official docs.
- Adjusted the Linkerd tap/top mapping to avoid implying Istio has a direct `tap` equivalent.

## Review Notes
The migration approach is technically valid when Linkerd inbound policy permits non-meshed clients during the transition. Clusters using stricter Linkerd authorization policies will need explicit temporary allowances before moving namespaces to Istio.
