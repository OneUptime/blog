# Validation Summary: How to Secure Calico Operator Migration

## Status
validated

## Post Type
Guide / Security Best Practices Tutorial

## Technologies Covered
- Calico (Tigera Operator)
- Kubernetes RBAC (ServiceAccounts, ClusterRoleBindings, ClusterRoles)
- `kubectl` CLI
- `calicoctl` CLI
- Kubernetes Audit Policy (audit.k8s.io/v1)
- Bash scripting
- Mermaid diagrams

## Sources Consulted
- Kubernetes `kubectl create token` documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-token-em-
- Kubernetes Auditing reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Audit Policy API: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Calico Tigera Operator documentation: https://docs.tigera.io/calico/latest/operations/operator-migration
- `calicoctl` CLI reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
No technical issues found.

All commands and configurations verified:
- `kubectl create serviceaccount`, `kubectl create clusterrolebinding`, and `kubectl create token --duration=2h` are all valid (token subcommand introduced in Kubernetes 1.24, GA in 1.25).
- `calicoctl get globalnetworkpolicies`, `calicoctl get networkpolicies`, `calicoctl get globalnetworksets`, and the `gnp`/`np` shortnames are valid.
- The audit `Policy` schema (`apiVersion: audit.k8s.io/v1`, `kind: Policy`, `level: Request`, `resources` with `group`/`resources`, and `namespaces` filter) is correct per the Kubernetes audit API.
- ClusterRoleBinding syntax `--clusterrole=cluster-admin --serviceaccount=<ns>:<sa>` is correct.
- Cleanup commands correctly invalidate the bound token (deleting the SA invalidates TokenRequest-issued tokens via SA UID validation).

## Review Notes
- The `KUBECONFIG_MIGRATION` sed manipulation in Security Control 1 works in simple cases, but is fragile if multiple users exist in the kubeconfig or if the existing user is configured with client certs rather than a token. In production, generating a fresh kubeconfig file for the migration SA is more robust.
- The conclusion mentions "revoke migration credentials immediately after the migration window closes." Note that `kubectl create token` produces a time-bound token (2h here) that cannot be explicitly revoked except by deleting the underlying ServiceAccount — which the cleanup script does. This is correct in practice but worth being aware of.
- The `tigera-operator` ClusterRole intentionally has broad permissions (it manages CNI installation, DaemonSets, network policies, etc.); the post correctly notes this is a "known requirement" for standard deployments.
- The post does not pin to a specific Calico/Tigera Operator version. The commands shown are stable across recent Calico releases (3.20+).
