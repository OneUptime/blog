# Validation Summary: How to Use talosctl upgrade-k8s for Kubernetes Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd snapshots
- kube-apiserver, kube-controller-manager, kube-scheduler, kubelet, kube-proxy, and CoreDNS

## Sources Consulted
- Talos Kubernetes upgrade guide: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/upgrading-kubernetes
- Talos CLI reference for `upgrade-k8s`, `service`, and `health`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos support matrix: https://docs.siderolabs.com/talos/v1.7/getting-started/support-matrix
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes deprecation policy metrics guidance: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl/

## Issues Found
- The post said `talosctl upgrade-k8s` upgrades etcd. I removed etcd from that list because the official Talos Kubernetes upgrade flow updates Kubernetes component images, kube-proxy, kubelet, and bootstrap manifests; etcd is not part of the `upgrade-k8s` phase list.
- The documented upgrade phase order was inaccurate. I updated it to match the Talos guide: pre-pull images, update control plane component images, update kube-proxy, update kubelet, and re-apply bootstrap manifests.
- The post implied CoreDNS is always upgraded. I changed this to say bootstrap manifests are re-applied and CoreDNS can be updated when Talos provides changed manifests.
- The rollback section recommended downgrading with `upgrade-k8s --to <previous-version>`. I replaced that with retry guidance because Kubernetes downgrades are not a routine supported rollback path and Talos documents failed `upgrade-k8s` runs as safe to restart.
- The deprecated API check used `kubectl get apiservices`, which lists APIService resources rather than deprecated API usage. I replaced it with the Kubernetes API server metric check for `apiserver_requested_deprecated_apis`.
- The automation example used `kubectl version --short`, which is not listed in the current generated kubectl reference. I replaced it with `kubectl version`.
- The troubleshooting section used `talosctl services`, but the current Talos CLI command is `talosctl service`. I corrected the command.

## Review Notes
The example target version `1.30.0` and the compatibility note for Talos v1.7.x are consistent with the Talos v1.7 support matrix. The commands assume working Talos and Kubernetes credentials and an appropriate context for each cluster.
