# Validation Summary: How to Choose Between Control Plane and Worker Node Configurations

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes
- etcd
- kube-apiserver, kube-controller-manager, kube-scheduler
- kubelet, kube-proxy
- containerd
- talosctl CLI

## Sources Consulted
- Talos Linux v1.7 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos Linux v1.7 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Kubernetes documentation on control plane taint `node-role.kubernetes.io/control-plane:NoSchedule` (introduced in Kubernetes 1.20, with the `master` variant fully removed in 1.25)
- etcd documentation on quorum and odd-numbered cluster sizing

## Issues Found
No technical issues found.

All configuration fields referenced in the post (`cluster.etcd.ca`, `cluster.apiServer.certSANs`, `cluster.controllerManager`, `cluster.scheduler`, `cluster.secretboxEncryptionSecret`, `cluster.ca`, `cluster.aggregatorCA`, `cluster.serviceAccount`, `cluster.controlPlane.endpoint`, `cluster.token`, `cluster.allowSchedulingOnControlPlanes`) are valid Talos v1alpha1 machine config fields.

All `talosctl` commands and flags shown (`talosctl gen config`, `talosctl apply-config --insecure --nodes X --file FILE`, `talosctl reset --nodes X`) are valid.

The Kubernetes control plane taint name (`node-role.kubernetes.io/control-plane:NoSchedule`) is current — the legacy `node-role.kubernetes.io/master` variant has been removed.

The etcd quorum math (3 nodes → quorum 2, 5 nodes → quorum 3) and the recommendation to use odd-numbered control plane counts are correct.

The component split between control plane (etcd, kube-apiserver, kube-controller-manager, kube-scheduler) and worker (kubelet, container runtime, kube-proxy) is accurate, and noting kube-proxy runs on both in the summary table is correct.

The PKI claim — that worker nodes receive only the cluster CA certificate but not the private key — matches how `talosctl gen config` produces the two configs.

## Review Notes
- The post hard-codes Talos v1alpha1 examples without naming a version. The fields shown have been stable for many Talos releases, so this is unlikely to age poorly soon, but a future major schema change (e.g., v1alpha2) could invalidate examples. A version note could be added in a future revision.
- `talosctl gen config` actually produces three files by default (`controlplane.yaml`, `worker.yaml`, and `talosconfig`). The post says "two separate machine configuration files," which is technically accurate (`talosconfig` is a client config, not a machine config) but a reader might initially expect the wording to mention all generated outputs.
- The "Recommended minimums: 4 CPU cores, 8 GB RAM" for control plane nodes are sensible production recommendations but exceed Talos's documented absolute minimums (2 cores, 2 GiB). The post frames them as recommendations, which is appropriate.
- The `talosctl reset` example is intentionally simplified. In practice a user may need flags like `--graceful=false` (when the node cannot cleanly leave the cluster), `--wipe-mode`, and `--reboot` depending on the scenario. The simplification is reasonable for the post's scope.
