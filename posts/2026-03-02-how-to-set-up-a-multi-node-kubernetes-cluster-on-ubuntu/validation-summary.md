# Validation Summary: How to Set Up a Multi-Node Kubernetes Cluster on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Kubernetes (v1.29) with kubeadm
- Ubuntu 22.04 LTS
- containerd (container runtime)
- Flannel (CNI plugin)
- kubelet, kubectl
- systemd cgroup driver
- Linux kernel modules (overlay, br_netfilter) and sysctl parameters

## Sources Consulted
- Kubernetes official installation docs: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- kubeadm init documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Container runtimes / containerd setup: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes networking ports reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes apt package repository (pkgs.k8s.io): https://kubernetes.io/blog/2023/08/15/pkgs-k8s-io-introduction/
- Flannel official repository: https://github.com/flannel-io/flannel
- Docker apt repository for containerd.io: https://docs.docker.com/engine/install/ubuntu/
- kubeadm token TTL reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/

## Issues Found
No technical issues found. All commands, URLs, kernel parameters, network ports, and configuration steps verified against official Kubernetes documentation:
- The five inter-node ports listed (6443, 2379-2380, 10250, 10259, 10257) match the documented control-plane port list.
- The pkgs.k8s.io repo URL pattern for v1.29 is correct.
- containerd's `SystemdCgroup = true` is the documented cgroup driver requirement.
- `--pod-network-cidr=10.244.0.0/16` is the correct default for Flannel.
- Flannel manifest URL at `flannel-io/flannel/releases/latest/download/kube-flannel.yml` is the current official location.
- Default kubeadm bootstrap-token TTL is indeed 24 hours.

## Review Notes
- **`kubectl get componentstatuses` is deprecated**: The componentstatus API has been deprecated since Kubernetes v1.19. The command still functions in v1.29 (the version this tutorial pins to) but emits a deprecation warning and may return incomplete data. It is expected to be removed in a future release. Modern alternatives include `kubectl get --raw='/readyz?verbose'` against the API server or examining the static pods in `kube-system` directly. Left in place since the tutorial pins to v1.29 where the command remains functional.
- **Kubernetes v1.29 lifecycle**: As of the validation date (2026-05-19), v1.29 has reached end-of-life (community support ended February 2025). Readers may wish to substitute a currently-supported minor version (e.g. v1.31 or v1.32) by changing the two `v1.29` strings in the apt repo URLs. The tutorial steps themselves remain the same.
- **Worker-node ports not enumerated**: The post lists control-plane ports but does not separately enumerate worker-only ports (10256 for kube-proxy health, 30000-32767 for NodePort services). These aren't needed for cluster bootstrap, but readers exposing NodePort services later may need to adjust firewall rules.
- **`--control-plane-endpoint` on a single-control-plane setup**: Including this flag is harmless and is good practice if HA is added later, but is not strictly required for a single-control-plane cluster. Not an error.
- **Label `node-role.kubernetes.io/worker=worker`**: Works fine; in `kubectl get nodes` the ROLES column displays the suffix after the slash, so workers will show as `worker`. No issue.
