# Validation Summary: How to Create and Manage ServiceAccounts in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kubernetes Secrets
- ServiceAccount tokens and TokenRequest
- kubectl
- YAML manifests

## Sources Consulted
- Kubernetes Service Accounts concept documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Managing Service Accounts reference: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes RBAC authorization reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl create serviceaccount reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_serviceaccount/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kube-apiserver service account token options: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
- The post said the default ServiceAccount has "minimal permissions" and later that ServiceAccounts have "no permissions by default." Kubernetes documentation states that default ServiceAccounts have no permissions other than default API discovery permissions in RBAC-enabled clusters. Updated both statements to include that nuance.
- The post said Kubernetes automatically mounts a token into pods without noting the automount setting. Updated the sentence to clarify that automatic mounting happens unless token automounting is disabled.
- The long-lived token section was labeled "Kubernetes 1.24+", which could imply manual long-lived token Secrets only exist starting in Kubernetes 1.24. Updated the heading to "Create a Long-Lived Token Secret" and kept the manifest, which matches current official guidance for manually creating service account token Secrets.

## Review Notes
- The RBAC Role, RoleBinding, ClusterRole, and ClusterRoleBinding examples use current `rbac.authorization.k8s.io/v1` APIs and valid subject and roleRef fields.
- The `serviceAccountName` field is the current Pod spec field; the deprecated `.spec.serviceAccount` alias is not used.
- The `kubectl create token --duration` examples are valid, but Kubernetes may issue a token with a shorter or longer duration depending on API server configuration.
- `kubectl` is not installed in the local environment, so CLI behavior was verified against official Kubernetes `kubectl` reference documentation rather than local command output.
