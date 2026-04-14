# Validation Summary: How to Understand the Dapr Operator Service

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane, Operator service)
- Kubernetes (CRDs, RBAC, Helm, kubectl)
- gRPC (Operator-to-sidecar communication)

## Sources Consulted
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_operator/values.yaml
- Dapr Operator deployment template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_operator/templates/dapr_operator_deployment.yaml
- Dapr Operator source code (gRPC API): https://github.com/dapr/dapr/blob/master/pkg/operator/api/api.go
- Dapr Operator source code (watched CRDs): https://github.com/dapr/dapr/blob/master/pkg/operator/operator.go
- Dapr RBAC templates: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_rbac/templates/operator.yaml
- Dapr CRD definitions: https://github.com/dapr/dapr/tree/master/charts/dapr/crds
- Dapr preview features documentation: https://docs.dapr.io/operations/support/support-preview-features/
- Dapr component updates documentation: https://docs.dapr.io/operations/components/component-updates/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md

## Issues Found

1. **HTTPEndpoint CRD missing from intro section**: The "What Is the Dapr Operator?" section listed only Component, Configuration, Resiliency, and Subscription CRDs, but omitted HTTPEndpoint — which was inconsistent with the `kubectl get crds` output later in the post. Added `HTTPEndpoint` to the text list and Mermaid diagram.

2. **Non-existent Helm value `dapr_operator.leaderElection`**: The post used `--set dapr_operator.leaderElection=true` in the Helm command and included `leaderElection: true` in the values file. This Helm key does not exist in the Dapr chart. Leader election is built into the Operator and activates automatically when multiple replicas are running. Removed the flag and updated the explanation.

3. **Incorrect RBAC verbs for Dapr CRDs**: The post showed `verbs: ["get", "list", "watch", "update", "patch"]` for the `dapr.io` apiGroup resources. The actual ClusterRole grants only `get, list, watch` for Dapr CRDs. Removed `update` and `patch` from the verbs list.

## Review Notes
- The CRD list output is missing the newer `mcpservers.dapr.io` CRD, which has been added in recent Dapr versions. This is a minor omission that may become more relevant as MCP support matures.
- The RBAC snippet shown in the post is a simplified subset of the actual `dapr-operator-admin` ClusterRole, which includes additional rules for `apiextensions.k8s.io`, pods, services, and conditionally `argoproj.io`. The simplification is acceptable for a guide but readers should be aware the actual role is more extensive.
- The HotReload feature flag is correctly shown as a preview feature that must be explicitly enabled. As of the latest Dapr documentation, it has not yet graduated to stable/default.
