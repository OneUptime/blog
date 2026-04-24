# Validation Summary: How to Set Up Kubernetes RBAC Alongside Portainer RBAC - K8s

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- Kubernetes RBAC
- Service accounts
- `kubectl`
- YAML manifests

## Sources Consulted
- Portainer Roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer Kubernetes RBAC policy documentation: https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-rbac-policy
- Portainer Kubernetes namespace access documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer Kubernetes cluster setup documentation: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer Business Edition on Kubernetes installation documentation: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Portainer Kubernetes agent installation documentation: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes `kubectl create serviceaccount` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_serviceaccount
- Kubernetes `kubectl create clusterrolebinding` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_clusterrolebinding/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The introduction and interaction model implied that Portainer RBAC is independent of Kubernetes RBAC. I corrected this to reflect Portainer's documented behavior: Kubernetes RBAC must be enabled for Portainer access control, Portainer maps its roles onto Kubernetes roles and bindings, and some Portainer restrictions are UI-only.
- The QA example attempted to deny secret access with an empty `verbs` list after granting wildcard read access. Kubernetes RBAC is additive and has no deny rules, so this would still allow reading Secrets. I replaced that example with a binding to the built-in `view` ClusterRole, which intentionally excludes Secrets.
- The platform-team example attempted to grant `*` access and then restrict RBAC changes in a later rule. Because RBAC rules are additive, the wildcard rule already granted RBAC modification access. I replaced it with a broad allow-list of non-RBAC API groups and added the missing binding.
- The original RBAC manifest was incomplete for QA and platform examples because it referenced access patterns without complete service account and binding objects. I added the missing `ServiceAccount` and `ClusterRoleBinding` resources so the example is internally consistent.
- The mapping section claimed Portainer integrates team kubeconfigs. I removed that claim and rewrote the example so `kubectl create token` is presented only for direct Kubernetes API or CLI access outside Portainer.
- The section about restricting Portainer's own service account used `podsecuritypolicies`, which was removed in Kubernetes v1.25, and presented a custom restriction model that is not documented by Portainer. I replaced that section with commands to review the installed Portainer RBAC objects instead.

## Review Notes
- Local `kubectl` was not available in the workspace, so CLI syntax was validated against the official Kubernetes command reference rather than local `--help` output.
- Portainer documents that secret-content restrictions for non-admins are UI-only, so Kubernetes RBAC remains the authoritative enforcement point for direct API and CLI access.
