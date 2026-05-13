# Validation Summary: How to Configure IPVS Mode with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kube-proxy
- IPVS
- Calico
- ipvsadm
- kubectl

## Sources Consulted
- Kubernetes: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes: kube-proxy Configuration API - https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes: kube-proxy command reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes: kubectl create deployment reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes: kubectl expose reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes: kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico: Use IPVS kube-proxy - https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Calico: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf

## Issues Found
- Kubernetes v1.35 and later deprecates kube-proxy IPVS mode and recommends nftables as the replacement where supported. Added this caveat to avoid presenting IPVS as the current best default for new clusters.
- The post did not mention that `ipvsadm` is required for the verification commands. Added it to prerequisites.
- The `modprobe` example passed multiple module names without using the multi-module form. Changed it to `modprobe --all ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh`.
- Calico auto-detects kube-proxy IPVS mode when `calico-node` starts. Added a `calico-node` restart step for clusters where kube-proxy is changed after Calico is already running.
- The IPVS entry count was described as comparable to the number of Services, but Kubernetes creates IPVS virtual servers per service port and also for NodePorts, external IPs, and load balancer IPs. Clarified that the comparison is only a rough check and not one-to-one.
- The test client command created a pod but did not attach to it, so it would not show the `wget` result directly. Updated it to use `--rm -i --restart=Never`.
- The architecture diagram referred to `Calico eBPF/iptables` while the post is about kube-proxy IPVS. Calico eBPF mode replaces kube-proxy service handling and has special migration requirements from IPVS, so the label was changed to `Calico routing and policy`.
- The diagram used `O1 lookup`; changed it to `O(1) lookup`.

## Review Notes
IPVS mode remains technically available, but it is deprecated in Kubernetes v1.35 and later. This guide is most appropriate for existing clusters that still need IPVS or clusters on platforms where nftables mode is not yet suitable. For new Linux clusters on supported kernels, Kubernetes documentation recommends evaluating nftables mode instead.
