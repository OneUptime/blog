# Validation Summary: How to Install MetalLB on kubeadm Clusters from Scratch

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-proxy
- MetalLB
- Helm
- Layer 2 ARP/NDP advertisement
- BGP and ECMP routing
- Kubernetes Services

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB requirements: https://metallb.io/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB BGP concepts: https://metallb.io/concepts/bgp/
- MetalLB release notes: https://metallb.io/release-notes/
- Kubernetes kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Official MetalLB v0.16.0 manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-native.yaml

## Issues Found
- The post said kubeadm clusters use kube-proxy in IPVS mode by default on many setups. Kubernetes documentation states the Linux kube-proxy default is `iptables`, with `ipvs` available when configured. Updated the wording to say Kubernetes defaults to iptables on Linux and that some kubeadm clusters are configured for IPVS.
- The post pinned MetalLB `v0.14.9`, while the current official MetalLB installation documentation and release notes list `v0.16.0`. Updated the install and uninstall manifest URLs to `v0.16.0`.
- The prerequisites omitted MetalLB's Layer 2 requirement for TCP and UDP traffic on port 7946 between nodes. Added the requirement to the prerequisite list.

## Review Notes
The MetalLB CR examples use current CRD API versions and valid fields: `IPAddressPool` and `L2Advertisement` use `metallb.io/v1beta1`, `BGPPeer` uses `metallb.io/v1beta2`, and `BGPAdvertisement` uses `metallb.io/v1beta1`. The `kubectl` and Helm commands match the documented installation flows, though `kubectl` and `helm` were not installed in the local environment, so command validation was performed against official documentation and manifests rather than local CLI help.
