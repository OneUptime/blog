# Validation Summary: How to Debug Kubernetes Service Load Balancing with iptables and ipvs

## Status
validated

## Post Type
Technical guide / debugging tutorial

## Technologies Covered
- Kubernetes Services
- kube-proxy
- iptables
- IPVS
- nftables
- EndpointSlices
- kubectl
- ipvsadm
- conntrack
- tcpdump

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, including kube-proxy modes, iptables behavior, IPVS deprecation, and nftables guidance: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API reference, including current ProxyMode values and defaults: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes blog: Endpoints deprecation and EndpointSlice migration guidance for Kubernetes v1.33+: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes kubectl logs reference, including label selector usage: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl expose reference, including deployment exposure examples and flags: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- ipvsadm man page, including list commands, scheduler names, forwarding methods, statistics, and weights: https://manpages.ubuntu.com/manpages/focal/man8/ipvsadm.8.html
- Local command help for `iptables` v1.8.10 to verify table/list/delete/TRACE rule syntax patterns.

## Issues Found
- The post said kube-proxy has three modes: iptables, IPVS, and userspace. Current Kubernetes documentation lists Linux kube-proxy modes as `iptables`, `ipvs`, and `nftables`, with Windows using `kernelspace`; the userspace proxy is no longer a current Linux mode. Updated the mode section accordingly.
- The post described IPVS as replacing iptables. Kubernetes IPVS mode uses kernel IPVS together with iptables APIs. Updated the explanation to match current Kubernetes documentation.
- The post did not mention that IPVS mode is deprecated as of Kubernetes v1.35 and that nftables is the recommended high-scale replacement. Added that caveat where IPVS behavior and performance are discussed.
- The post used `kubectl get endpoints` and `kubectl describe endpoints`. The Endpoints API is deprecated as of Kubernetes v1.33. Replaced those commands with EndpointSlice label-selector commands.
- The post stated that perfect load balancing shows equal connections across backends. This was too absolute because distribution depends on scheduler, weights, connection duration, and session affinity. Reworded it to describe the expected trend rather than a guarantee.
- The post described IPVS backends with weight 0 as "down." Weight 0 means the backend should not receive new connections; it is not necessarily equivalent to a pod or endpoint being down. Reworded the description.
- The comparison table claimed iptables performs well only below 1000 services and IPVS is excellent for 10000+ services. Current Kubernetes docs note iptables performance has improved and IPVS is deprecated in favor of nftables for high-scale use. Updated the table.
- The comparison table described iptables rule updates as a full chain rebuild. Current Kubernetes documentation notes that since v1.28, iptables mode makes more minimal updates. Updated the wording.

## Review Notes
The remaining commands are operationally plausible but environment-dependent: exact kube-proxy labels, log locations, package manager names, and node firewall behavior can vary by distribution or managed Kubernetes provider. The post now reflects current Kubernetes API and kube-proxy mode guidance while preserving its original iptables/IPVS debugging focus.
