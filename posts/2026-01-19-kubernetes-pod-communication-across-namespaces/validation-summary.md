# Validation Summary: How to Configure Kubernetes Pod-to-Pod Communication Across Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes namespaces
- Kubernetes Services and DNS service discovery
- Kubernetes NetworkPolicy
- Kubernetes RBAC, Roles, RoleBindings, and ServiceAccounts
- kubectl commands
- CNI network policy providers

## Sources Consulted
- Kubernetes documentation: Namespaces - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Services, including ExternalName - https://kubernetes.io/docs/concepts/services-networking/service/#externalname
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The first `allow-frontend-to-backend` NetworkPolicy example used separate `namespaceSelector` and `podSelector` entries in the same `from` list. Kubernetes treats those as OR conditions, which would allow all pods from the frontend namespace and also matching pods from the policy's own namespace. Changed the example to put `namespaceSelector` and `podSelector` in the same list item so it selects frontend pods in the frontend namespace.
- Several DNS egress examples used `namespaceSelector: {}` with `podSelector: k8s-app=kube-dns`, which could match pods with that label in any namespace. Changed those examples to select the `kube-system` namespace explicitly.
- The post said Kubernetes 1.21+ automatically adds `kubernetes.io/metadata.name`; official docs mark automatic namespace labeling stable in Kubernetes 1.22. Updated the version reference.
- The troubleshooting section advised adding `kubernetes.io/metadata.name` manually. That label is immutable and set by the control plane, so the command would fail or be misleading on modern clusters. Replaced it with a custom namespace label example.
- The namespace template showed `kubernetes.io/metadata.name` under user-specified labels. Removed that manual setting and clarified that Kubernetes 1.22+ adds it automatically.

## Review Notes
The examples use `k8s-app: kube-dns` to select DNS pods, which is common for CoreDNS deployments created by Kubernetes tooling but can vary by distribution. Readers should confirm DNS pod labels in their cluster before applying the policy unchanged.
