# Validation Summary: How to Set Up MetalLB on a Single-Node Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services and kube-proxy
- MetalLB
- MetalLB Layer 2 mode
- MetalLB IPAddressPool and L2Advertisement custom resources
- kubectl
- Helm
- MicroK8s
- ARP/NDP networking

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB Layer 2 concepts documentation: https://metallb.io/concepts/layer2/
- MetalLB advanced Layer 2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration
- MetalLB API reference: https://metallb.io/apis/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes virtual IPs and Service proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- MicroK8s MetalLB addon documentation: https://microk8s.io/docs/addon-metallb

## Issues Found
- The architecture diagram incorrectly put the MetalLB speaker in the traffic forwarding path from the node to the Service. MetalLB Layer 2 mode answers ARP/NDP for the service IP, while kube-proxy handles service traffic after it reaches the node. Updated the diagram to show MetalLB advertising the VIP and kube-proxy routing service traffic.
- The prerequisites only listed `iptables` and `ipvs` kube-proxy modes and excluded `userspace`. Current Kubernetes documentation lists `iptables`, `nftables`, and `ipvs` as Linux kube-proxy modes, with IPVS deprecated and strict ARP required by MetalLB when IPVS is used. Updated the prerequisite accordingly.
- The troubleshooting section used `kubectl get endpoints`, but the Endpoints API is deprecated in Kubernetes v1.33 and later. Replaced it with an EndpointSlice lookup using the `kubernetes.io/service-name` label.
- The troubleshooting cause that told readers to switch from `userspace` to `iptables` or `ipvs` was outdated for current Kubernetes. Replaced it with a mode-neutral note about kube-proxy service forwarding rules.

## Review Notes
The pinned MetalLB manifest URL for v0.14.9 and the Helm repository URL were reachable during review. MetalLB's current installation documentation references a newer release, so the pinned version may be worth refreshing in a future content update, but the CRD examples remain valid for the version used in the post.
