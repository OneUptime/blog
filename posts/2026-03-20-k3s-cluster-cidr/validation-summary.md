# Validation Summary: How to Configure K3s Cluster CIDR

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes networking
- CIDR planning for Pod and Service networks
- CoreDNS
- IPv4/IPv6 dual-stack networking
- `kubectl`

## Sources Consulted
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s configuration file and installation options: https://docs.k3s.io/installation/configuration
- K3s basic network options: https://docs.k3s.io/networking/basic-network-options
- K3s uninstall documentation: https://docs.k3s.io/installation/uninstall
- K3s requirements and networking notes: https://docs.k3s.io/installation/requirements
- K3s cluster access documentation: https://docs.k3s.io/cluster-access
- K3s overview / architecture note on single-process control plane: https://docs.k3s.io/
- Kubernetes dual-stack networking: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kube-controller-manager` flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/

## Issues Found
- The post labeled `172.16.0.0/12` as Docker's default bridge range. I corrected this to `172.17.0.0/16`, which matches Docker's common default bridge subnet.
- The original verification commands used `kubectl cluster-info dump` and `ps aux | grep controller`, which are not reliable ways to verify `cluster-cidr` on K3s because K3s runs the control-plane components inside a single `k3s` process. I replaced them with checks against `/etc/rancher/k3s/config.yaml`, node `podCIDRs`, and the `kube-dns` Service.
- The sizing guide mixed pod-count language with node-count calculations and implied `/24` meant 256 pods per node. I rewrote that guidance to describe default `/24` node CIDR allocation, removed the misleading note, and added the documented requirement to adjust `node-cidr-mask-size-ipv4` and `node-cidr-mask-size-ipv6` when changing the cluster mask.
- The `/20` example said it was suitable for clusters with fewer than 32 nodes. With the default `/24` node CIDR allocation, that is about 16 nodes, so I corrected the example.
- The large-cluster `/12` example used a non-canonical base address (`10.42.0.0/12`). I corrected it to `10.32.0.0/12`.
- The dual-stack example used a broader IPv6 pod CIDR than the K3s documentation recommends in its example. I aligned it to the documented `/56` example size.
- The rebuild section suggested `kubectl get all` as a backup/restore path and included extra manual cleanup steps. I changed it to a more technically accurate rebuild flow: back up manifests separately, uninstall K3s, recreate the config, reinstall, and then restore workloads from backup or source control.

## Review Notes
- K3s documents dual-stack support as stable starting with `v1.23.7+k3s1`.
- For dual-stack clusters prior to Kubernetes 1.27, K3s documents a kubelet `node-ip` workaround when the primary network interface is not used for cluster traffic.
- If pod or service CIDRs are changed from the defaults, K3s also requires corresponding firewall rule updates.
