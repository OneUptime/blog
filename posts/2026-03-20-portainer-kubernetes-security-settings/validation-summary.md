# Validation Summary: How to Configure Kubernetes Cluster Security Settings in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission / Pod Security Standards
- Kubernetes Service Accounts

## Sources Consulted
- Portainer Cluster Setup: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer namespace access management: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer roles: https://docs.portainer.io/sts/admin/user/roles
- Portainer Kubernetes roles and bindings reference: https://docs.portainer.io/2.21/advanced/kubernetes-roles-and-bindings
- Portainer activity logs: https://docs.portainer.io/admin/logs/activity
- Portainer manifest deployment flow: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer Kubernetes installation requirements: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels
- Kubernetes Service Accounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes service-account configuration for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/

## Issues Found
- Step 1 used the wrong Portainer navigation path and listed settings that do not match the documented Kubernetes cluster setup screen. I changed it to `Cluster → Setup` and replaced the settings block with documented security and deployment options.
- Step 2 described namespace access with ad hoc per-namespace permissions like `Read/Write`, `Read only`, and `Admin`. I corrected this to Portainer's actual `Manage access` workflow and clarified that effective permissions come from environment or environment-group roles such as `Standard User`, `Read-Only User`, and `Namespace Operator`.
- Step 3 claimed Portainer creates custom Kubernetes `Role` and `RoleBinding` objects for Portainer team names. That is not how Portainer documents its Kubernetes RBAC model. I replaced the YAML with the documented Portainer role mappings (`cluster-admin`, `portainer-basic`, `portainer-edit`, `portainer-view`, and related bindings).
- Step 4 said the example restricted inter-namespace communication, but the manifest only matched pods in the same namespace. I corrected the explanation and comment to match the actual YAML, and I fixed the Portainer deployment path to `Applications → Create from code → Manifest → Web editor`.
- Step 5's pod hardening fragment was incomplete for a typical restricted baseline because it omitted seccomp configuration. I added `seccompProfile.type: RuntimeDefault`.
- Step 6 pointed readers to `Settings → Audit logs`, which is not the documented location. I changed it to `Logs → Activity` and clarified that these are Portainer activity logs.
- Step 8 recommended replacing Portainer's own service-account permissions with an arbitrary read-only `ClusterRole`, which is misleading and incomplete for a Portainer-managed cluster. I replaced it with accurate guidance to use the official Portainer installation RBAC and to restrict end-user actions with Portainer roles and namespace access.

## Review Notes
- Namespace access control in Portainer depends on Kubernetes RBAC being enabled and working.
- Pod Security Admission is generally available in Kubernetes 1.25 and later. The namespace-label example is valid as written; version-pinning labels can be added later if the post needs stricter upgrade guidance.
- Portainer's detailed Kubernetes role mapping is documented in the official roles-and-bindings reference, while the current STS roles page documents the user-facing role model. I used both because Portainer splits the details across those pages.
