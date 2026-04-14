# Validation Summary: How to Use RBAC with Dapr on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Custom Resource Definitions, Operator, sidecar architecture)
- Kubernetes RBAC (Roles, RoleBindings, ClusterRoles)
- Kubernetes Audit Logging
- kubectl CLI

## Sources Consulted
- Dapr CRD definitions in the Dapr Helm chart (`github.com/dapr/dapr/charts/dapr/crds/`)
- Kubernetes RBAC documentation (https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- Kubernetes Audit Policy documentation (https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- Kubernetes `kubectl auth can-i` documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth_can-i/)
- Dapr secrets documentation (https://docs.dapr.io/operations/components/component-secrets/)

## Issues Found
1. **`--as=user:developer1` in `kubectl auth can-i` commands**: The `--as` flag takes a plain username string, not a `user:` prefixed type. Kubernetes would interpret `user:developer1` as a literal username (including the `user:` prefix), which is not the intended behavior. Fixed both occurrences to `--as=developer1`.

## Review Notes
- The Dapr CRD list omits the newer `mcpservers.dapr.io` CRD. This is a recent addition to Dapr and may not be relevant to most readers. The post says "several CRDs" without claiming to be exhaustive, so this is not an error but worth noting for future updates.
- The ClusterRole example uses `resources: ["*"]` and `verbs: ["*"]` wildcards, which is valid syntax but the Kubernetes RBAC good practices guide warns against wildcards as they automatically grant access to any new resource types or verbs added in the future. The post does include a note to "bind this role only to trusted service accounts," which partially addresses the concern.
- All YAML manifests are syntactically correct and use current, non-deprecated API versions.
- The explanation of Dapr's secret resolution via `secretKeyRef` and the `dapr-operator` service account in `dapr-system` is accurate.
