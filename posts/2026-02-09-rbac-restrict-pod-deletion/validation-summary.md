# Validation Summary: How to Configure RBAC to Restrict Pod Deletion While Allowing Deployment Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes RBAC
- kubectl
- Kubernetes Deployments, Pods, ReplicaSets, StatefulSets, Services, ConfigMaps, Secrets, and Nodes
- Kubernetes Pod eviction and PodDisruptionBudgets
- Kubernetes audit policy
- Prometheus alerting

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes API-initiated eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes audit documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kube-apiserver audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The audit policy attempted to match failed pod deletion attempts with `responseStatus.code: 403` inside a `PolicyRule`. Kubernetes audit policies choose which requests to log, but `responseStatus` is an audit event field, not a supported audit policy rule selector. I removed the invalid rule and configured the policy to log pod delete requests at `Metadata` level, with failed attempts filtered later from the audit log using `jq`.
- The Prometheus alert used `apiserver_audit_event_total` with labels such as `resource`, `verb`, `responseStatus_code`, and `user`. The official Kubernetes metrics reference lists `apiserver_audit_event_total` as an unlabeled audit event counter, so that expression would not work against kube-apiserver metrics. I changed the example to use a derived counter exported from matching audit log events.
- The nested Markdown example under "Educating Users on Proper Workflows" had invalid closing fences such as ```bash and ```text. I changed the outer fence to a four-backtick Markdown fence and corrected the inner code block closings so the sample renders correctly.

## Review Notes
- `kubectl` was not installed in the workspace, so CLI validation was performed against official Kubernetes generated command references rather than local `kubectl --help` output.
- The break-glass example uses `cluster-admin` through a namespace RoleBinding. This is technically valid and grants broad namespace-level access, but a narrower emergency ClusterRole limited to pod deletion would be preferable in production.
