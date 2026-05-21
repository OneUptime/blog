# Validation Summary: How to Implement Network Segmentation with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Envoy sidecar proxy
- Kubernetes
- Kubernetes NetworkPolicy
- Kiali and Prometheus telemetry

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio health checking of services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus integration docs: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The mesh-wide `PeerAuthentication` example was correct for a default Istio root namespace, but the text did not clarify that mesh-wide policies must be applied in Istio's root namespace. Added that context.
- The default-deny `AuthorizationPolicy` example included `metadata.namespace: backend`, but the following commands reused the same file with `kubectl apply -n data` and `-n frontend`. Because `metadata.namespace` in a manifest determines the target namespace, those commands would not apply the shown manifest to the other namespaces. Updated the text and commands to use equivalent per-namespace manifests.
- The default-deny explanation said "nothing can talk to anything within those namespaces." Istio authorization policies apply to target workloads, so this was too broad. Changed it to say workloads in those namespaces will not accept traffic unless allowed by another policy.
- The rollout guidance mentioned "audit mode" imprecisely. Istio has an `AUDIT` action, but it does not enforce allow or deny decisions, and dry-run is the documented way to preview enforcement effects. Updated the guidance to recommend the dry-run annotation.
- The health-check guidance said kubelet probes do not go through Envoy and will not be affected by authorization policies. Istio rewrites HTTP, TCP, and gRPC probes by default so the sidecar agent can handle them correctly with mTLS. Updated the text to describe default probe rewriting and the caveat for disabled rewrites or mesh-routed health checks.
- The NetworkPolicy example depended on namespace labels but did not state that prerequisite. Added a sentence noting the assumed `zone` labels.

## Review Notes
The Istio API versions and fields used in the YAML snippets are current in the official Istio reference. The Prometheus dashboard command is valid, but it requires Prometheus to be installed in the cluster. The NetworkPolicy example is valid, assuming the cluster uses a CNI plugin that enforces Kubernetes NetworkPolicy.
