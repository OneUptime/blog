# Validation Summary: How to Configure Network Policies for Dapr on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar, sentry, operator, placement, dashboard)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Kubernetes namespaceSelector and podSelector
- mTLS (mutual TLS)

## Sources Consulted
- Dapr official documentation — Sidecar configuration and default ports (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr official documentation — Sentry service (https://docs.dapr.io/concepts/dapr-services/sentry/)
- Dapr official documentation — Operator service (https://docs.dapr.io/concepts/dapr-services/operator/)
- Dapr official documentation — Placement service (https://docs.dapr.io/concepts/dapr-services/placement/)
- Dapr GitHub source — runtime config, sentry config, operator deployment templates
- Kubernetes official documentation — NetworkPolicy resource (https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- Kubernetes documentation — Well-known labels including `kubernetes.io/metadata.name` (https://kubernetes.io/docs/reference/labels-annotations-taints/)

## Issues Found
No technical issues found.

## Review Notes
- The `dapr.io/enabled: "true"` key is used as a `podSelector.matchLabels` value in the NetworkPolicies. In Dapr, this key is typically a pod **annotation** (used to trigger sidecar injection), not a pod **label**. NetworkPolicies only match on labels. Users must ensure their pod specs include `dapr.io/enabled: "true"` as a label (in addition to the annotation) for these policies to match. This is a common and valid pattern, but could benefit from a clarifying note.
- The set of policies shown is illustrative, not production-complete. A full default-deny setup would also need DNS egress (UDP/TCP port 53 to kube-dns) and sidecar-to-sidecar egress on port 50002 for service invocation. This is acceptable for a tutorial format.
- The Sentry port (50001) matches the sidecar gRPC API port (also 50001). These are different processes on different pods, so there is no conflict, but it could be briefly clarified for readers unfamiliar with Dapr architecture.
- All four NetworkPolicy YAML manifests are syntactically correct and use the current `networking.k8s.io/v1` API.
