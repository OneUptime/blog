# Validation Summary: How to Configure K3s for Low-Resource Environments - Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Kubelet
- kube-apiserver
- kube-controller-manager
- containerd
- SQLite
- Linux swap
- Docker images
- PersistentVolumes

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Swap Memory Management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes Linux Node Swap Behaviors: https://kubernetes.io/docs/reference/node/swap-behavior/
- Kubernetes Kubelet Configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kube-apiserver CLI Reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-controller-manager CLI Reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager
- containerd CRI Configuration: https://github.com/containerd/containerd/blob/release/2.0/docs/cri/config.md
- cri-tools `crictl` docs: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md

## Issues Found
- The introduction and hardware table understated current official K3s minimums. I updated them to match current K3s requirements, and replaced the unsupported storage/architecture claims with the documented architecture list and SSD guidance.
- The kubelet tuning section used deprecated kubelet CLI flags and included settings that were described as optimizations even though they matched defaults. I converted the section to the current KubeletConfiguration drop-in format and removed the no-op/default-only tuning lines.
- The kube-apiserver section described `default-watch-cache-size` as a watch-timeout setting, which is incorrect, and described `max-requests-inflight` settings as request-body limits, which is also incorrect. I removed the incorrect flag usage and fixed the explanation.
- The containerd section used an incorrect K3s config path and an outdated plugin path for current containerd-based K3s releases. I changed it to the documented K3s-generated containerd path and the current template-based customization approach.
- The swap guidance reflected older Kubernetes behavior. I updated it to current Kubernetes swap support, using a kubelet config drop-in with `failSwapOn` and `memorySwap.swapBehavior`.
- The Deployment example was invalid for `apps/v1` because it omitted the required `.spec.selector` and matching pod-template labels. I added the required selector and labels.
- The conclusion made an unsupported production-viability claim for very constrained Raspberry Pi 3 hardware. I revised it to stay within the documented minimum-resource guidance.

## Review Notes
- Current K3s documentation recommends kubelet configuration drop-ins on K3s v1.32 and later; older releases may still rely on `--kubelet-arg` overrides.
- `k3s crictl rmi --prune` is supported by current cri-tools, but `crictl rmi` semantics differ from Docker and can remove all tags for an image reference; the post uses `--prune`, not tag-based removal.
- The resource reservations and eviction thresholds shown are valid examples, but they are still workload-dependent and should be tested on the target hardware before production use.
