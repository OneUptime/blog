# Validation Summary: How to Configure Node CIDR Mask Size for IPv4 Pod Allocation in Kubernetes

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kubernetes (kube-controller-manager, kubelet, kubeadm)
- IPv4 CIDR / subnetting
- Pod networking and IPAM
- kubeadm ClusterConfiguration v1beta3

## Sources Consulted
- kube-controller-manager flags reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/ (`--node-cidr-mask-size`, `--cluster-cidr`)
- kubeadm v1beta3 ClusterConfiguration spec: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/ (verified `controllerManager.extraArgs` is a `map[string]string`)
- kubeadm install/customize control plane components: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/control-plane-flags/
- kubelet `--max-pods` documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/ (default 110)
- kubectl JSONPath / static pod manifest path (`/etc/kubernetes/manifests/`): Kubernetes documentation
- IPv4 subnetting math (RFC 950 / RFC 4632) for verifying 2^(node_mask − cluster_mask) subnet counts

## Issues Found
1. **Incorrect address-count and node-count arithmetic in the "How CIDR Allocation Works" block.**
   - The post stated `Cluster Pod CIDR: 10.244.0.0/16 (65,534 addresses)`. A /16 contains 2^16 = **65,536** addresses; 65,534 is the usable-host count for a single subnet, but when subdividing a Pod CIDR into per-node subnets all 65,536 addresses are partitioned, so 65,536 is the correct figure. Changed to `65,536`.
   - The post stated `65,534 / 256 = 256 nodes`. The result 256 is correct (2^(24−16) = 256 subnets) but the dividend was wrong. Updated to `65,536 / 256 = 256 nodes`.
   - The post stated `65,534 / 64 = 1,023 nodes`. Both the dividend and the result were wrong: a /16 split into /26 subnets yields 2^(26−16) = **1,024** subnets, which is also what the later table and the `MAX_NODES` shell calculation produce. Updated to `65,536 / 64 = 1,024 nodes` so the section is internally consistent with the rest of the post.

## Review Notes
- The kubeadm `apiVersion: kubeadm.k8s.io/v1beta3` is still supported, but `v1beta4` was introduced in Kubernetes 1.31 and is the current recommended version. In v1beta4 `extraArgs` changed from `map[string]string` to a list of `{name, value}` objects, so readers on newer kubeadm releases will eventually need to migrate. The v1beta3 syntax shown here remains valid for clusters using v1beta3.
- `node-cidr-mask-size` is a single flag that applies to the IP family of `--cluster-cidr`. For dual-stack clusters, `--node-cidr-mask-size-ipv4` and `--node-cidr-mask-size-ipv6` should be used instead — the post is scoped to IPv4 so this is fine, but worth flagging for future expansion.
- `kubectl get nodes -o jsonpath='...{.spec.podCIDR}...'` returns the first/legacy CIDR; for dual-stack readers `.spec.podCIDRs` would be the more complete field.
- The "Pods per node ≈ 110" approximation for /24 correctly reflects the kubelet `--max-pods` default capping the usable count well below the 254 IPs available.
