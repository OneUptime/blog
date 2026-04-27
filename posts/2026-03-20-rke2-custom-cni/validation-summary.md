# Validation Summary: How to Set Up RKE2 with a Custom CNI Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2 (Rancher Kubernetes Engine 2)
- CNI (Container Network Interface)
- Cilium (eBPF-based CNI)
- Calico (CNI with network policy and BGP)
- Canal (default RKE2 CNI)
- Helm
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 networking options: https://docs.rke2.io/networking/basic_network_options
- Cilium kube-proxy-free documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium CLI releases: https://github.com/cilium/cilium-cli/releases
- Cilium stable version pointer: https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt
- Calico (Tigera) Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico GitHub releases: https://github.com/projectcalico/calico/releases

## Issues Found

1. **Deprecated Cilium Helm value `kubeProxyReplacement=strict`**
   - The string values `strict`, `partial`, and `disabled` for `kubeProxyReplacement` were deprecated in Cilium 1.14 in favor of boolean `true`/`false`.
   - Fixed in two places: the `helm install` command and the Best Practices section now use `kubeProxyReplacement=true` / `kubeProxyReplacement: true`.

2. **Outdated Calico operator manifest reference (v3.27.0)**
   - v3.27.0 was released in January 2024. The latest stable Calico release as of April 2026 is v3.31.5.
   - Updated the `kubectl create -f` URL to reference `v3.31.5/manifests/tigera-operator.yaml`.

## Review Notes
- The default RKE2 cluster CIDRs (`10.42.0.0/16`) and service CIDR (`10.43.0.0/16`) shown in the post are correct.
- `cni: none` and `disable: rke2-canal` are valid RKE2 server config entries.
- The Calico `Installation` resource fields (`apiVersion: operator.tigera.io/v1`, `calicoNetwork.ipPools[].{blockSize, cidr, encapsulation, natOutgoing, nodeSelector}`) are all valid; `VXLANCrossSubnet` is a valid encapsulation enum value.
- The Cilium CLI install snippet (using `stable.txt` and the `cilium-linux-amd64.tar.gz` artifact) is correct and matches current upstream.
- For users following the Cilium path with `kubeProxyReplacement: true`, RKE2 will need kube-proxy disabled (e.g. `disable-kube-proxy: true` in the RKE2 config) — this is already noted in the Best Practices section.
- The post does not pin a specific Cilium chart version; readers will pull whatever is current from the Helm repo. Pinning to a tested chart version (e.g. `--version 1.19.x`) would be a future-proofing improvement but is not technically incorrect.
