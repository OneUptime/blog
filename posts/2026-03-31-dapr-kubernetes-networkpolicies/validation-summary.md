# Validation Summary: How to Use Dapr with Kubernetes NetworkPolicies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, service invocation, pub/sub)
- Kubernetes NetworkPolicies (networking.k8s.io/v1)
- Kubernetes namespace selectors and pod selectors

## Sources Consulted
- Dapr sidecar annotations and arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/ (confirmed sidecar HTTP port 3500, gRPC port 50001, internal gRPC port 50002, metrics port 9090)
- Dapr Helm chart - sentry values: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sentry/values.yaml (confirmed sentry target port 50001)
- Dapr Helm chart - placement values: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml (confirmed placement API port 50005)
- Dapr Helm chart - operator values: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_operator/values.yaml (confirmed operator target port 6500)
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/ (confirmed system service names)

## Issues Found
1. **Step 1 - Missing internal gRPC port for sidecar-to-sidecar communication**: The NetworkPolicy only opened ports 3500 (HTTP API) and 50001 (gRPC API), but actual sidecar-to-sidecar communication uses the internal gRPC port 50002. Added port 50002 to both ingress and egress rules.

2. **Step 2 - Incorrect sentry port (50006 → 50001)**: The policy listed port 50006 for the sentry service, but this is actually the scheduler service port. The Dapr sentry service listens on target port 50001 (with Kubernetes service port 443). Changed to 50001.

3. **Step 2 - Incorrect operator port (9090 → 6500)**: The policy listed port 9090 for the operator service, but 9090 is the Prometheus metrics port shared by all Dapr components. The Dapr operator service listens on target port 6500 (with Kubernetes service port 443). Changed to 6500.

## Review Notes
- The blog does not mention the Dapr scheduler service (port 50006), which is part of the control plane in Dapr 1.12+. Depending on the Dapr version targeted, a port rule for the scheduler may also be needed in Step 2.
- The `kubernetes.io/metadata.name` namespace label used in Step 2 is automatically applied in Kubernetes 1.21+, which is correct for modern clusters.
- The default deny policy in Step 4 is correctly structured but should ideally be applied first (before the allow rules) in a real deployment, as mentioned in the text. The step ordering in the post is pedagogical rather than operational.
- The blog does not address DNS egress (port 53 to kube-dns/CoreDNS), which would be needed alongside the default-deny policy for Dapr service discovery to work. In practice, a DNS egress rule is almost always required when using a default-deny policy.
