# Validation Summary: How to Diagnose ClusterIP Reachability Issues with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services and ClusterIP
- kube-proxy
- iptables
- EndpointSlices and Endpoints
- Calico CNI and Calico network policy
- Calico IP pools
- tcpdump and conntrack

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kube-proxy configuration API documentation: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico Kubernetes services and network policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/get-started/about-kubernetes-services
- Calico service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Local iptables and tcpdump command help in the review environment

## Issues Found
- The post stated that kube-proxy programs iptables rules without qualification. Kubernetes supports iptables, IPVS, nftables, and Windows kernelspace proxy modes, so the statement is only accurate for iptables mode. Changed the text to say "In iptables mode".
- The post implied Calico policies block traffic directly to ClusterIP services. Calico documentation explains that, in typical kube-proxy service handling, policy is enforced based on pods after DNAT rather than against the service ClusterIP itself. Updated the wording to clarify that policy can block traffic sent via a ClusterIP service and is evaluated against the client and backend pods.
- The pod CIDR check used `kubectl cluster-info dump | grep -m 1 cluster-cidr`, which is fragile and depends on control-plane flags being visible. Replaced it with a `kubectl get nodes` JSONPath command that reads node `spec.podCIDRs` directly.

## Review Notes
The remaining commands are valid diagnostic commands for clusters using kube-proxy in iptables mode with Calico. In clusters using kube-proxy IPVS or nftables mode, Calico eBPF service handling, or managed distributions with different component namespaces and labels, the same troubleshooting sequence may need mode-specific command adjustments.
