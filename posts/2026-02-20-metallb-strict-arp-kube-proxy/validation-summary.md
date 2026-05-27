# Validation Summary: How to Enable Strict ARP Mode for kube-proxy Before Installing MetalLB

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- kube-proxy
- IPVS proxy mode
- MetalLB
- Layer 2 ARP announcements
- kubectl

## Sources Consulted
- Kubernetes kube-proxy configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB Layer 2 mode documentation: https://metallb.io/concepts/layer2/
- MetalLB BGP mode documentation: https://metallb.io/concepts/bgp/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- kubectl local help output for `rollout restart`, `diff`, and related commands where available

## Issues Found
- The post incorrectly described missing strict ARP as a likely cause of LoadBalancer services staying in `Pending`. MetalLB's controller assigns IPs, while speakers advertise assigned IPs via L2 or BGP. Missing strict ARP affects ARP ownership and reachability after an IP is assigned, so the intro and troubleshooting heading were changed to describe assigned-but-unreachable or flaky LoadBalancer IPs.
- The post described IPVS as common in production clusters for better performance. Current Kubernetes documentation marks IPVS proxy mode as deprecated and recommends nftables as its replacement on supported Linux systems, so the wording was updated to describe IPVS as still used in some existing clusters and add the current nftables caveat.
- The post said the restart command deletes kube-proxy pods, but the command shown uses `kubectl rollout restart daemonset kube-proxy`. The prose and comments were corrected to match the command's actual behavior.
- The explanation of strict ARP was tightened to match Kubernetes' configuration reference: `strictARP` configures ARP behavior to avoid answering ARP queries from the `kube-ipvs0` interface.

## Review Notes
The MetalLB preparation snippet and the `kubectl get | sed | kubectl diff/apply` commands match MetalLB's official installation documentation. The guide remains version-sensitive because Kubernetes proxy mode guidance changed over time: IPVS clusters still need this setting, but new clusters on modern Linux should evaluate nftables instead of choosing IPVS by default.
