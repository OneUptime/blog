# Validation Summary: How to Implement Multi-Tenancy in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission
- kubectl
- Bash scripting

## Sources Consulted
- Kubernetes multi-tenancy documentation: https://kubernetes.io/docs/concepts/security/multi-tenancy/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/

## Issues Found
- The RBAC verification commands impersonated only a user, but the RoleBindings in the post bind permissions to groups. Updated the `kubectl auth can-i` examples to include `--as-group=team-a-developers` so the checks match the RBAC subjects being tested.
- The tenant provisioning script applied manifests with `kubectl apply -n "$TENANT_NAME"`, but the example manifests contain hardcoded `metadata.namespace: tenant-a`. The namespace flag does not override a manifest's explicit namespace, so the resources would be applied to `tenant-a` instead of the new tenant. Updated the script to render temporary tenant-specific manifests before applying them.

## Review Notes
- The NetworkPolicy examples require a CNI plugin that enforces Kubernetes NetworkPolicy resources; otherwise, the API objects can be created but traffic will not be restricted.
- The DNS NetworkPolicy uses the common `k8s-app: kube-dns` selector in `kube-system`, but managed clusters may label DNS pods differently.
