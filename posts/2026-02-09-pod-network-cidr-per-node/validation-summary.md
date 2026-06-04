# Validation Summary: How to configure pod network CIDR allocation per node

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kube-controller-manager
- kubeadm
- Kubernetes Node API
- CNI
- Calico IPAM
- flannel
- host-local IPAM
- kubectl
- Go client-go

## Sources Consulted
- Kubernetes kube-controller-manager command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kubeadm v1beta4 configuration reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes Node API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- CNI host-local IPAM plugin documentation: https://www.cni.dev/plugins/v0.6/ipam/host-local/
- Calico IP address management documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- flannel project documentation: https://github.com/flannel-io/flannel

## Issues Found
- The post implied Kubernetes node CIDR allocation is always the default. Updated the wording to clarify that it applies when node CIDR allocation is enabled and when the CNI uses that allocation.
- The post equated subnet size directly with usable pod count and subtracted network/broadcast addresses. Updated the examples to describe address capacity and note that actual pod capacity depends on CNI reservations and kubelet `maxPods`.
- The controller-manager image used the deprecated `k8s.gcr.io` registry. Updated it to `registry.k8s.io`.
- The kubeadm examples used `kubeadm.k8s.io/v1beta3` and map-style `controllerManager.extraArgs`. Updated them to current `v1beta4` syntax with structured `extraArgs`.
- The Calico section incorrectly said Calico IPAM reads `Node.spec.podCIDR` by default. Updated it to state that Calico IPAM allocates from Calico IPPools and does not use Kubernetes node CIDR allocations by default.
- The host-local IPAM example used a nonstandard `"usePodCIDR"` subnet value. Replaced it with a concrete CIDR and clarified that a custom CNI or installer must render the node-specific CIDR into the config.
- The exhaustion section said new nodes cannot join the cluster. Updated it to the more precise behavior: nodes may register but fail to receive pod CIDRs.
- The manual per-node annotation example used Calico node address/tunnel annotations rather than pod CIDR allocation. Replaced it with a Calico IPPool example scoped by `nodeSelector`.
- The Go example imported `corev1` without using it, which would prevent compilation. Removed the unused import.

## Review Notes
The post is technically valid after correction. Future improvements could mention CNI-specific behavior for other common plugins such as Cilium and kube-router, but that was outside the scope of correcting existing inaccuracies.
