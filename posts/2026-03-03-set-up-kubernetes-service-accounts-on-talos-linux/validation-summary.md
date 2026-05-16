# Validation Summary: How to Set Up Kubernetes Service Accounts on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- Kubernetes ServiceAccount tokens and TokenRequest API
- Kubernetes Secret-based long-lived ServiceAccount tokens
- Kubernetes Pod token automounting
- Talos Linux machine configuration
- talosctl

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Managing Service Accounts documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#token
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching

## Issues Found
- The first ServiceAccount manifest used the `monitoring` namespace but did not create it, so the example would fail on a cluster where that namespace does not already exist. Added a `Namespace` resource to `service-account.yaml`.
- The Talos command used `talosctl apply-config --patch`, but the documented `apply-config` patch flag is `--config-patch`; live machine configuration patching uses `talosctl patch machineconfig --patch`. Updated the command to use `talosctl patch machineconfig --nodes ... --patch @sa-token-config.yaml`.
- The audit command comment said it found all service accounts with write access, but `kubectl auth can-i --list --as=...` lists permissions for one impersonated subject. Updated the comment to describe the command accurately.
- The signing-key section described `talosctl get secretstatus` as viewing current cluster secrets. The command reports rendered secrets status, not the secret material itself. Updated the comment accordingly.

## Review Notes
The Kubernetes ServiceAccount, RBAC, TokenRequest, long-lived token Secret, automount, and `kubectl create token` examples align with current Kubernetes documentation. Long-lived `kubernetes.io/service-account-token` Secrets remain supported for manual creation but are not recommended for most use cases. Talos exposes kube-apiserver flags through `cluster.apiServer.extraArgs`; changes that affect ServiceAccount issuer or signing behavior should be planned carefully because existing tokens and API server discovery metadata can be affected.
