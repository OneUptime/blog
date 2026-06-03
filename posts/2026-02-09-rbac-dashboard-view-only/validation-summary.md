# Validation Summary: Build RBAC Roles for Kubernetes Dashboard Users with View-Only Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Dashboard
- ServiceAccounts and ServiceAccount tokens
- Kubernetes Secrets
- Kubernetes audit policies
- Kubernetes NetworkPolicy
- metrics-server / metrics.k8s.io

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes ServiceAccount token documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Dashboard repository and v7.14.0 argument documentation: https://github.com/kubernetes/dashboard
- Kubernetes Dashboard v7 skip-login discussion: https://discuss.kubernetes.io/t/kubernetes-dashboard-skip-login-argument/27599

## Issues Found
- The post claimed that granting only `list` on Secrets provides metadata-only Secret access. This is incorrect because Kubernetes Secret list/get access can expose Secret data through the API. I removed Secret permissions from the view-only ClusterRole and Role examples, updated the Secret restriction section, and changed the permission tests to expect `list secrets` to return `no`.
- The Dashboard security snippet included `--enable-skip-login=false` and `--token-ttl=43200`. Kubernetes Dashboard v7 does not support the old skip-login flag, and the current v7.14.0 documented arguments do not include `token-ttl`. I removed those stale flags and added version-specific guidance.
- The ServiceAccount token section requested a very long token duration without explaining API server limits. I added a note that the issued lifetime can differ from the requested `--duration`.
- The custom viewer Deployment used `serviceAccountName: dashboard-viewer` in the `monitoring` namespace even though the earlier ServiceAccount was created in `kubernetes-dashboard`. I added a note that the ServiceAccount must be created in the `monitoring` namespace for that Deployment.

## Review Notes
The Kubernetes Dashboard upstream repository was archived in January 2026, and the latest release listed in the repository is v7.14.0 from October 30, 2025. Future readers should verify Dashboard-specific installation labels, Helm chart values, and container arguments against the exact Dashboard fork or version they deploy.
