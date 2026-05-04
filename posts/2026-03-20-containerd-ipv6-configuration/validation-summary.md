# Validation Summary: How to Configure containerd with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- containerd (container runtime)
- CNI (Container Network Interface) plugins (bridge, host-local, portmap, loopback)
- nerdctl (Docker-compatible CLI for containerd)
- Kubernetes (kubeadm, dual-stack networking)
- Calico CNI
- Linux kernel sysctls (IPv6 forwarding, br_netfilter)
- IPv6 / dual-stack networking

## Sources Consulted
- containerd configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- CNI plugins releases (v1.4.0): https://github.com/containernetworking/plugins/releases/tag/v1.4.0
- CNI bridge plugin spec (dual-stack `ranges` format): https://www.cni.dev/plugins/current/main/bridge/
- CNI host-local IPAM spec: https://www.cni.dev/plugins/current/ipam/host-local/
- Kubernetes dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/ (confirms /108 service-CIDR limit for IPv6)
- kubeadm v1beta3 ClusterConfiguration: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- nerdctl releases (v1.7.3): https://github.com/containerd/nerdctl/releases/tag/v1.7.3
- Calico IPPool CRD: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calico-node environment variables (IP6, CALICO_IPV6POOL_CIDR): https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico v3.27.0 manifests: https://github.com/projectcalico/calico/releases/tag/v3.27.0

## Issues Found
No technical issues found.

The post's technical content is accurate:
- containerd `config.toml` v2 layout with `[plugins."io.containerd.grpc.v1.cri".cni]`, `bin_dir`, and `conf_dir` is correct.
- CNI conflist with `cniVersion: "1.0.0"`, dual-stack `ranges` (one IPv4 list, one IPv6 list) and dual-stack `routes` is the canonical format for dual-stack with the bridge + host-local plugins.
- Sysctl keys `net.ipv6.conf.all.forwarding` and `net.bridge.bridge-nf-call-ip6tables` are correct, as is loading `br_netfilter` for the latter to take effect.
- nerdctl install path, `--network`, `-p`, `inspect`, `exec` usage are all valid.
- kubeadm `ClusterConfiguration` (v1beta3) with comma-separated `serviceSubnet`/`podSubnet` for dual-stack is the documented format; the `/108` cap on the IPv6 service CIDR is honored.
- Calico `IPPool` schema (`cidr`, `ipipMode`, `natOutgoing`, `nodeSelector`) and the `IP6=autodetect` / `CALICO_IPV6POOL_CIDR` env vars on the `calico-node` DaemonSet are correct.

## Review Notes
- The `kubeadm.k8s.io/v1beta3` API is current as of the Kubernetes versions widely deployed at writing; `v1beta4` was introduced in Kubernetes 1.31 and v1beta3 is being deprecated, so future readers on newer clusters may want to migrate.
- For Calico dual-stack, `FELIX_IPV6SUPPORT=true` is sometimes also required on older Calico versions; on v3.27.0 it defaults to enabled when an IPv6 pool exists, so the post's minimal env-var set is sufficient.
- `promiscMode: true` on the bridge plugin is a valid option but is not strictly required for IPv6 — left unchanged as it is not incorrect.
- The closing line groups Flannel with Calico/Cilium for Kubernetes IPv6; Flannel's IPv6/dual-stack support exists but has historically been more limited than Calico/Cilium. Not technically wrong, just worth noting for readers choosing a CNI.
