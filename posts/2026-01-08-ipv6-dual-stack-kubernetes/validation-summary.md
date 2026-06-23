# Validation Summary: How to Enable Dual-Stack IPv4/IPv6 Networking in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (dual-stack IPv4/IPv6 networking)
- kubeadm (cluster init and join configuration)
- Calico CNI (Tigera operator, Installation CRD, IP pools)
- Cilium CNI (Helm install, IPAM, kube-proxy replacement)
- Flannel CNI (dual-stack config)
- CoreDNS
- Kubernetes Services (ipFamilies / ipFamilyPolicy)
- NGINX Ingress
- Linux networking (sysctl, ip, ip6tables)

## Sources Consulted
- IPv4/IPv6 dual-stack | Kubernetes — https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes 1.23: Dual-stack IPv4/IPv6 Networking Reaches GA — https://kubernetes.io/blog/2021/12/08/dual-stack-networking-ga/
- kubectl version `--short` flag removal (k/k #122455, kubespray #10654) — https://github.com/kubernetes/kubernetes/issues/122455
- Cilium kube-proxy-free / kubeProxyReplacement docs — https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium `tunnel` → `routingMode`/`tunnelProtocol` deprecation (cilium #27756, #28376) — https://github.com/cilium/cilium/issues/27756
- Calico Installation / IP pool reference — https://docs.tigera.io/calico/latest/reference/installation/api
- kubeadm config (v1beta3) — https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/

## Issues Found
1. **Incorrect GA version claim (two locations).** The post stated dual-stack has been supported "since version 1.21 as a stable feature" and "Dual-stack is stable in Kubernetes 1.21+". Dual-stack was *beta* in 1.21 and reached *GA/stable* in **Kubernetes 1.23** (the `IPv6DualStack` feature gate was removed in 1.23). Corrected both occurrences to 1.23.
2. **Removed `kubectl version --short` flag (two locations).** The `--short` flag was deprecated and then removed; on kubectl v1.28+ it returns `error: unknown flag: --short`, and the post otherwise targets v1.29. The short-style output is now the default. Changed both `kubectl version --short` invocations to `kubectl version`.

## Review Notes
- **Cilium values (`cilium-values.yaml`) are valid for the pinned 1.14.5 but use deprecated keys.** `kubeProxyReplacement: strict` and `tunnel: vxlan` still work in 1.14.x but are deprecated: `strict` is superseded by `true`, and `tunnel` is superseded by `routingMode: tunnel` + `tunnelProtocol: vxlan`. Both were removed/replaced in Cilium 1.15+. Left as-is since the example explicitly pins `--version 1.14.5`, where they remain functional; worth modernizing if the version is bumped.
- The IPv6 service CIDR `fd00:10:96::/108` is correct — Kubernetes requires the IPv6 service CIDR to be no larger than a `/108`.
- kubeadm `apiVersion: kubeadm.k8s.io/v1beta3` is correct for the stated `kubernetesVersion: v1.29.0` (v1beta4 was introduced in 1.31).
- CIDR planning, Calico operator/IP-pool config (blockSize 122 for the IPv6 pool, BGP enabled with `encapsulation: None`), Service `ipFamilies`/`ipFamilyPolicy` examples, CoreDNS Corefile, and the AWS LoadBalancer `aws-load-balancer-ip-address-type: dualstack` annotation all check out against current docs.
- The Go/Python wildcard-bind examples and `sysctl`/`ip6tables` diagnostics are accurate.
