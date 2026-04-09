# Validation Summary: How to Configure Prometheus RBAC for Rook-Ceph Monitoring

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Kubernetes RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding, RoleBinding)
- Prometheus (service discovery, metrics scraping)
- Prometheus Operator / kube-prometheus-stack (ServiceMonitor, PodMonitor, PrometheusRule CRDs)
- Rook-Ceph (monitoring endpoints)
- kubectl (auth can-i impersonation, resource inspection)

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Prometheus Operator documentation: https://prometheus-operator.dev/docs/
- Rook-Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- kube-prometheus-stack Helm chart default RBAC: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found
1. **Misleading claim about Secrets access in "Why RBAC is Needed" section**: The original text stated Prometheus needs to "Read Secrets referenced by ServiceMonitors (for TLS/auth)". However, the Prometheus Operator handles reading Secrets and mounting them into the Prometheus pod — the Prometheus server's own ServiceAccount does not need direct RBAC access to Secrets. The ClusterRole in the post correctly did not include Secrets, making the explanation inconsistent with the configuration. Fixed the bullet points to accurately reflect what the Prometheus ServiceAccount actually needs: access to monitoring CRDs and node metrics/non-resource URLs.

## Review Notes
- The namespace-scoped RoleBinding in the `rook-ceph` namespace is technically redundant when a ClusterRoleBinding for the same ClusterRole is already in place (since the ClusterRoleBinding grants cluster-wide access including `rook-ceph`). This is not incorrect — it works fine — but readers should know that if they use the ClusterRoleBinding, the RoleBinding adds no additional permissions. If the goal is least-privilege, one would use only RoleBindings in specific namespaces (without the ClusterRoleBinding) for namespace-scoped resources, combined with a separate ClusterRole/ClusterRoleBinding for cluster-scoped resources like nodes and nonResourceURLs.
- The `kubectl auth can-i get servicemonitors` command works when the CRD is installed, but the fully qualified form `servicemonitors.monitoring.coreos.com` is more explicit and avoids potential ambiguity.
- All YAML manifests use the current stable `rbac.authorization.k8s.io/v1` API version, which is correct and non-deprecated.
