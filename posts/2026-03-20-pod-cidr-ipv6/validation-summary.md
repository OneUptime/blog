# Validation Summary: How to Configure Pod CIDR for IPv6 in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubeadm
- IPv6
- Dual-stack networking
- Pod CIDR allocation
- Calico
- Flannel
- kubectl

## Sources Consulted
- Kubernetes: Dual-stack support with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- Kubernetes: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: Validate IPv4/IPv6 dual-stack - https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes: kubeadm init reference - https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes: kubeadm Configuration (v1beta3) - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- Kubernetes: kubeadm Configuration (v1beta4) - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes: kube-controller-manager reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager
- Calico: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico: IP pool reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico: Configure dual stack or IPv6 only - https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Flannel: project README - https://github.com/flannel-io/flannel
- Flannel: default kube-flannel manifest - https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml
- Flannel: subnet config source defining `EnableIPv6` and `IPv6Network` - https://raw.githubusercontent.com/flannel-io/flannel/master/pkg/subnet/config.go

## Issues Found
- The kubeadm config example used `apiVersion: kubeadm.k8s.io/v1beta3`, which is deprecated. I updated it to `v1beta4` so the post uses the current kubeadm configuration API.
- The kubeadm snippet pinned `kubernetesVersion: v1.29.0`, which made the example unnecessarily version-specific and outdated for a current guide. I removed that line and kept the example version-agnostic.
- The node and pod inspection examples used `jsonpath` output examples that were presented as JSON, which is not reliable for those fields. I switched those commands to `go-template`, matching the upstream dual-stack validation guidance and making the shown output accurate.
- The pod verification step used `kubectl exec testpod -- ip -6 addr show eth0`, which depends on the test image containing the `ip` utility. The sample image was `nginx`, so that command is not a safe assumption. I replaced it with `kubectl exec testpod -- cat /etc/hosts`, which is consistent with Kubernetes validation docs and still verifies both pod IPs from inside the container.
- The introduction implied CNIs always allocate pod IPs directly from `node.spec.podCIDRs`. That is too broad because some CNIs, such as Calico with Calico IPAM, use their own IP pools that must align with the cluster ranges. I corrected the explanation to distinguish Kubernetes-assigned PodCIDRs from CNI-managed pools.
- The advanced section said pod CIDRs cannot be changed after cluster initialization without qualification. Upstream kubeadm documentation is narrower: kubeadm does not support changing `podSubnet` later. I scoped the claim to kubeadm-managed clusters and updated the command to inspect the kubeadm-stored `podSubnet`.
- The IPv4 sizing math was wrong: `10.244.0.0/14` was described as 1M addresses, but a `/14` contains 262,144 addresses. I corrected the calculation and the associated node-CIDR estimate.
- The earlier comments equated a `/24` node CIDR with `256 pods/node`, which is not a precise statement. I changed the wording to describe the default per-node CIDR sizes instead of implying a pod-count guarantee.

## Review Notes
- The post's `fd00:` IPv6 examples are technically valid for private addressing, but official kubeadm dual-stack examples usually illustrate documentation/global-unicast-style ranges and note that bare-metal dual-stack nodes may require explicit kubelet `--node-ip` configuration.
