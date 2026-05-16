# Validation Summary: How to Upgrade Kubernetes on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- `talosctl`
- Kubernetes upgrades
- Kubernetes version skew policy
- etcd snapshots and recovery
- kube-proxy and CoreDNS
- Cilium
- Flannel

## Sources Consulted
- Sidero Labs Talos documentation, "Upgrading Kubernetes": https://docs.siderolabs.com/kubernetes-guides/advanced-guides/upgrading-kubernetes
- Sidero Labs Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos v1.7 support matrix: https://docs.siderolabs.com/talos/v1.7/getting-started/support-matrix
- Sidero Labs Talos disaster recovery documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium upgrade guide: https://docs.cilium.io/en/latest/operations/upgrade/
- Flannel project README: https://github.com/flannel-io/flannel

## Issues Found
- The post said Talos v1.7 supports Kubernetes v1.28 through v1.30. I changed this to v1.25 through v1.30, matching the official Talos v1.7 support matrix.
- The post simplified the `talosctl upgrade-k8s` phases and implied generic add-ons are upgraded. I changed the description to include image pre-pulling, control plane image updates, kube-proxy, Talos-managed bootstrap manifests such as CoreDNS, and kubelet upgrades when `--upgrade-kubelet` is enabled.
- The custom image example only overrode control plane images. I added `--proxy-image` and `--kubelet-image`, because the CLI exposes those flags and they are relevant for private-registry or air-gapped upgrades.
- The "What Gets Upgraded" list implied CoreDNS is upgraded as a general add-on. I clarified that Talos applies Talos-managed bootstrap manifests, such as CoreDNS, rather than upgrading arbitrary add-ons.
- The Flannel example used the old `raw.githubusercontent.com/.../master/Documentation/kube-flannel.yml` path. I changed it to the Flannel project's current release download URL.
- The troubleshooting section used `talosctl get events`. I changed this to `talosctl events --tail 50`, which matches the Talos CLI command for runtime events.
- The etcd recovery example used `talosctl etcd recover --snapshot`, which is not a current Talos CLI command. I changed it to `talosctl bootstrap --recover-from`, matching Talos disaster recovery documentation.

## Review Notes
The core workflow is technically valid: `talosctl upgrade-k8s --nodes <control-plane> --to <version>` performs a cluster-wide Kubernetes upgrade from a control plane node, and `--dry-run` is a supported way to preview the upgrade plan. The post still uses Kubernetes 1.29 to 1.30 examples, which are valid for the Talos versions discussed but are no longer current Kubernetes releases as of this review date.
