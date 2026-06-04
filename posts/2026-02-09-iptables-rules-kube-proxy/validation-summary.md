# Validation Summary: How to Configure iptables Rules Created by kube-proxy

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services
- kube-proxy
- iptables / netfilter
- EndpointSlices
- NodePort and ClusterIP service routing
- Session affinity
- externalTrafficPolicy
- nftables and IPVS proxy modes

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes documentation: Using Source IP, https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes API reference: Service v1, https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes documentation: Services and EndpointSlices, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: EndpointSlices, https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes API reference: Endpoints v1, https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes blog: NFTables mode for kube-proxy, https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/
- Local iptables help output from iptables v1.8.10 for command and conntrack option validation.

## Issues Found
- The post said kube-proxy watches Service and Endpoints changes. Endpoints is deprecated in Kubernetes v1.33+, and kube-proxy / modern service proxy integrations use EndpointSlices. Changed this to Service and EndpointSlice changes.
- The ClusterIP example used a manually created v1 Endpoints object. Replaced it with a discovery.k8s.io/v1 EndpointSlice example linked to the Service with the kubernetes.io/service-name label.
- The post described kube-proxy's probability-based endpoint selection as round-robin. Changed this to randomized load balancing, which matches the statistic-mode random rules shown.
- The post recommended migrating large clusters to IPVS mode. IPVS is deprecated in Kubernetes v1.35 and Kubernetes now recommends nftables for this use case. Updated the performance guidance and best practice to nftables mode.
- The externalTrafficPolicy Local section said nodes without local pods return an ICMP rejection. Kubernetes documents this behavior as dropping traffic when no local endpoints exist. Updated the wording.
- Troubleshooting commands used kubectl get endpoints. Updated them to query EndpointSlices by the kubernetes.io/service-name label.
- Custom filter examples matched -d $SERVICE_IP in the FORWARD chain, but Service VIP traffic has normally been DNAT'd before the filter FORWARD hook. Updated those examples to use conntrack original-destination matching with --ctorigdst and --ctorigdstport.

## Review Notes
- The exact kube-proxy-generated chain names and rule details can vary across Kubernetes versions, proxy mode, feature gates, and iptables backend, so the examples should be treated as representative output for iptables mode rather than a stable API.
