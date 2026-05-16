# Validation Summary: How to Set Up Kubernetes ServiceAccount Tokens on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes ServiceAccount tokens
- Kubernetes TokenRequest API
- Kubernetes projected volumes
- Kubernetes RBAC
- Talos Linux
- talosctl

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Managing Service Accounts documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes Configure Service Accounts for Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#token
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Kubernetes upgrade guide, APIServerConfig examples: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/upgrading-kubernetes

## Issues Found
- The Talos verification command used `talosctl logs kube-apiserver`, but Talos kube-apiserver runs as a Kubernetes static pod and the logs command is not the right way to inspect rendered API server arguments. Changed the example to `talosctl -n <control-plane-ip> get apiserverconfig -o yaml | grep -i "service-account"`, which matches the Talos APIServerConfig resource documented by Sidero Labs.
- The signing-key rotation snippet described `talosctl gen secrets -o secrets-backup.yaml` as backing up current secrets. The official CLI documentation says `talosctl gen secrets` generates a new secrets bundle; it does not back up existing cluster secrets. Updated the text to say to keep a secure copy of the current Talos machine configuration first, then generate a new secrets bundle for updated machine configs, with a warning that changing the ServiceAccount key invalidates tokens signed by the old key.

## Review Notes
The Kubernetes ServiceAccount, TokenRequest, projected volume, long-lived Secret, RBAC, and automount examples are aligned with current Kubernetes documentation. Long-lived ServiceAccount token Secrets remain supported but are explicitly not recommended by Kubernetes for most use cases.
