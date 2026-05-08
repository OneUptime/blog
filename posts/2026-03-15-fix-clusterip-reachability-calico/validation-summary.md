# Validation Summary: How to Fix ClusterIP Reachability Issues with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- kube-proxy
- iptables, nftables, and IPVS proxy modes
- Calico network policy
- Kubernetes NetworkPolicy
- EndpointSlice
- conntrack

## Sources Consulted
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/tasks/administer-cluster/enabling-endpointslices/
- Kubernetes Services documentation, Endpoints deprecation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes blog, Endpoints to EndpointSlices deprecation: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes blog, nftables mode for kube-proxy: https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/
- Calico network policy getting started: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Tier reference: https://docs.tigera.io/calico/latest/reference/resources/tier

## Issues Found
- The post used `kubectl get endpoints` and described empty Endpoints as the primary service backend check. Kubernetes v1.33 deprecates the Endpoints API in favor of EndpointSlice, while EndpointSlice has been stable since v1.21. Updated the text and verification command to use `kubectl get endpointslice -l kubernetes.io/service-name=<service-name> -n <namespace>`.
- The post advised switching from iptables mode to IPVS for performance issues. Current Kubernetes documentation marks IPVS proxy mode deprecated in v1.35 and documents nftables as stable in v1.33. Updated the recommendation to switch to nftables when nodes support it, changed the config value to `mode: "nftables"`, and replaced the IPVS verification command and troubleshooting note with nftables equivalents.
- The kube-proxy mode checklist only mentioned `iptables` and `ipvs`. Updated it to include `nftables`, which is an official Linux kube-proxy mode.

## Review Notes
The remaining commands and policy examples are technically valid for the stated Kubernetes and Calico scope. The nftables verification command assumes IPv4 service ClusterIPs; dual-stack or IPv6-only clusters may need to inspect the `ip6 kube-proxy` table as well.
