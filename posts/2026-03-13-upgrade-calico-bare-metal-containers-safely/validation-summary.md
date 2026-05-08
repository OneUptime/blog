# Validation Summary: How to Upgrade Calico on Bare Metal with Containers Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- BGP
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Quickstart guide for Tigera Operator install commands and current manifest version - https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico documentation: Installation API reference for operator-managed Installation, TigeraStatus, and nodeUpdateStrategy - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl get command and supported resource types - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes documentation: kubectl rollout command reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The Tigera Operator upgrade command used a stale Calico v3.27.0 manifest URL and did not apply the Calico v3 CRD manifest. Updated the commands to use the current v3.32.0 manifests and apply both `v1_crd_projectcalico_org.yaml` and `tigera-operator.yaml`.
- The operator manifest was applied with plain `kubectl apply`. Updated it to use `kubectl apply --server-side --force-conflicts`, matching the current official Calico upgrade guidance for manifest updates.
- The `calicoctl` download URL used v3.27.0. Updated it to v3.32.0 so the binary version matches the upgraded Calico version.

## Review Notes
The remaining commands are valid for an operator-managed Calico installation. The claim that only one node is updated at a time assumes the default DaemonSet rolling update behavior or an Installation `nodeUpdateStrategy` with `maxUnavailable` set to one.
