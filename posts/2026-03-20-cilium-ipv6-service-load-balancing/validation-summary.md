# Validation Summary: How to Cilium IPv6 Service Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes Services
- IPv6
- `LoadBalancer` Services
- eBPF kube-proxy replacement
- Cilium LB IPAM
- Cilium BGP Control Plane
- `kubectl`

## Sources Consulted
- Cilium LoadBalancer IP Address Management (LB IPAM): https://docs.cilium.io/en/stable/network/lb-ipam/
- Cilium BGP Control Plane: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The original prerequisite section used `ping6` and instructed readers to install Python and JavaScript IP parsing libraries that are unrelated to configuring Cilium service load balancing. I replaced that with IPv6 node checks and a documented `cilium-dbg status` check for kube-proxy replacement.
- The original "Core Implementation" was a generic Python subnet filter and did not configure Cilium or Kubernetes services at all. It also used invalid IPv6 literals such as `2001:db8:trusted::/48`, where `trusted` is not a valid hexadecimal hextet. I replaced it with an actual `Service` manifest using `type: LoadBalancer`, `loadBalancerClass: io.cilium/bgp-control-plane`, `ipFamilyPolicy: SingleStack`, `ipFamilies: [IPv6]`, and the `lbipam.cilium.io/ips` annotation.
- The original configuration YAML was not a Cilium API object and would not be accepted by Cilium. I replaced it with real `CiliumLoadBalancerIPPool`, `CiliumBGPPeerConfig`, `CiliumBGPClusterConfig`, and `CiliumBGPAdvertisement` resources from the official Cilium BGP and LB IPAM documentation.
- The original apply and verify section referenced a fictional `configure.py` workflow and a standalone Python `ipaddress` check, neither of which configured or validated Cilium. I replaced those commands with `kubectl apply` and `kubectl get` checks that verify IPv6 ClusterIP and LoadBalancer IP assignment on the Service.
- The original monitoring section contained another generic Python snippet, omitted the required `ipaddress` import, and still did not monitor Cilium-specific state. I replaced it with checks for service conditions, BGP peering, advertised IPv6 routes, and LB IP pool usage using documented Cilium and Kubernetes commands.
- The original conclusion described the task as generic IPv6 parsing and referenced a missing Python module name. I corrected it to reflect the real prerequisites and mechanics of Cilium IPv6 service load balancing: IPv6-enabled Cilium, kube-proxy replacement, LB IPAM, and a service IP advertisement mechanism such as the BGP Control Plane.

## Review Notes
- The post now matches the documented Cilium workflow as of the current stable Cilium documentation on 2026-05-06.
- The example IPv6 addresses and ASNs are illustrative. Readers still need to replace the pool CIDR, BGP peer address, and ASNs with values that fit their network.
- The verification `curl` assumes the `Service` has ready backends and that the advertised IPv6 VIP is routable from the client network.
