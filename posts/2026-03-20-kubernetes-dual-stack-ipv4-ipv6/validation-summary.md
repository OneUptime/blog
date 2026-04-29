# Validation Summary: How to Configure Kubernetes Dual-Stack Networking with IPv4 and IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- Calico
- Cilium
- IPv4
- IPv6
- Dual-stack networking

## Sources Consulted
- Kubernetes dual-stack networking docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Dual-stack support with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- kubeadm configuration API v1beta4: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico dual-stack / IPv6 configuration: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Flannel official README: https://github.com/flannel-io/flannel
- Cilium Kubernetes host-scope IPAM docs: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/

## Issues Found
- The prerequisites said Kubernetes 1.21+ was required. I corrected this to Kubernetes 1.20+ and noted that dual-stack is enabled by default starting in 1.21, which matches the Kubernetes documentation.
- The prerequisites listed Flannel as a dual-stack CNI example. I removed that example because Flannel's current official README describes Flannel as providing an IPv4 network, while Calico and Cilium have explicit dual-stack documentation.
- The kubeadm example used `kubeadm.k8s.io/v1beta3`. I updated it to `kubeadm.k8s.io/v1beta4`, which is the current kubeadm configuration API documented by Kubernetes.
- The kubeadm example omitted the `InitConfiguration` `node-ip` example used in the official dual-stack kubeadm guide. I added it so the example aligns with current kubeadm dual-stack guidance.
- The prerequisites omitted forwarding checks that are part of the documented setup requirements. I added IPv4 and IPv6 forwarding checks.
- The node verification example used `kubectl get nodes -o wide` to imply both node IP families would be visible there. I replaced it with a `jsonpath` command that reliably prints all `InternalIP` addresses.
- The control plane verification only checked `--cluster-cidr`. I expanded it to also check `--service-cluster-ip-range`, because both are part of dual-stack control plane configuration.
- The Service example comment said listing IPv4 first would "prefer IPv4 for traffic". I corrected that comment to explain the actual behavior: the first family in `ipFamilies` determines the legacy `clusterIP` field.
- The connectivity test tried to ping Service ClusterIPs. I replaced that with pod-to-pod IPv4 and IPv6 pings because ClusterIP Services are not valid ICMP test targets, and the original Service example did not create any backing endpoints.
- The Calico manifest comment described the resource inaccurately. I corrected it to identify the manifest as an operator-managed `Installation` resource and added the apply command context.

## Review Notes
- The post is technically correct after the fixes above.
- The Calico example assumes the Tigera operator has already been installed before the `Installation` resource is applied.
- On a dual-stack cluster, `RequireDualStack` and `PreferDualStack` both result in dual-stack Service allocation; the difference matters when dual-stack is unavailable.
