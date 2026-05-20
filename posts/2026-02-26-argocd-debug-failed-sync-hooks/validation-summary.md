# Validation Summary: How to Debug Failed Sync Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Argo CD sync hooks and hook deletion policies
- Argo CD CLI
- Kubernetes Jobs and Pods
- kubectl commands for logs, events, resource inspection, and debug Pods
- Kubernetes RBAC, ServiceAccounts, Roles, and RoleBindings
- Kubernetes Services and EndpointSlices
- Docker image manifest inspection

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes Job controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Service and EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/service/ and https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The `kubectl logs -l job-name=db-migrate` comment said it viewed logs from the most recent Pod. A label selector can return logs from matching Pods, so the comment was changed to "matching hook Pods."
- The OOMKilled example presented OOMKilled as a warning event. Kubernetes commonly exposes this through the container state or last state in `kubectl describe pod`, so the example was changed to show `State: Terminated`, `Reason: OOMKilled`, and exit code 137.
- The database troubleshooting commands used `kubectl get endpoints`, but the legacy Endpoints API is deprecated in Kubernetes v1.33 and later. This was changed to `kubectl get endpointslice -l kubernetes.io/service-name=postgres`.
- The hook deletion guidance implied `BeforeHookCreation` makes hook resources always available. The wording was corrected to say it keeps resources until the next hook creation, and the combined delete policy example was tightened to comma-separated values.

## Review Notes
The remaining commands and YAML examples are technically valid for current Argo CD and Kubernetes behavior. The interactive `kubectl run` example passes a decoded secret value through the local shell and command line; it is useful for debugging but should be handled carefully in shared terminals or shell history.
