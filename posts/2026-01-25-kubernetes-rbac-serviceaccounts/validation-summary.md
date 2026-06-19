# Validation Summary: How to Set Up Kubernetes RBAC for ServiceAccounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kubernetes Roles and ClusterRoles
- Kubernetes RoleBindings and ClusterRoleBindings
- Kubernetes projected ServiceAccount tokens
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Using RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Service Accounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes kubectl reference: kubectl auth can-i: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The Role example used `resourceNames: ["monitoring-config"]` together with `verbs: ["get", "list"]` for ConfigMaps. Kubernetes RBAC can restrict named resources, but `list` and `watch` requests must use a matching `metadata.name` field selector to be authorized with `resourceNames`. To avoid presenting a rule that would not work for ordinary list requests, I changed the ConfigMap permission to `verbs: ["get"]`.
- The debugging section described `kubectl logs -n kube-system -l component=kube-apiserver | grep RBAC` as viewing audit logs. The Kubernetes RBAC documentation describes RBAC denial messages in API server logs when verbose RBAC logging is enabled, not as audit logs. I changed the comment to "View API server logs for RBAC denials (if verbose RBAC logging is enabled)."

## Review Notes
The remaining examples use current stable Kubernetes APIs and field names, including `rbac.authorization.k8s.io/v1`, `apps/v1`, `spec.serviceAccountName`, `automountServiceAccountToken`, aggregated ClusterRoles, and projected ServiceAccount token fields such as `path`, `expirationSeconds`, and `audience`. `kubectl` was not installed in the local environment, so CLI syntax was checked against the official Kubernetes command reference instead of local `kubectl --help` output.
