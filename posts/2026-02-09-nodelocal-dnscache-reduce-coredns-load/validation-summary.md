# Validation Summary: How to Configure NodeLocal DNSCache to Reduce CoreDNS Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- kubelet configuration
- kube-proxy iptables and IPVS modes
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters - https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes upstream NodeLocal DNSCache manifest - https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
- Kubernetes documentation: Configuring each kubelet in your cluster using kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/kubelet-integration/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes API reference: PodDNSConfig - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- CoreDNS cache plugin documentation - https://coredns.io/plugins/cache/
- CoreDNS prometheus plugin documentation - https://coredns.io/plugins/metrics
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The original manifest substitution commands mixed iptables and IPVS mode behavior and did not match the official Kubernetes NodeLocal DNSCache instructions. Updated the commands to show the official mode-specific substitutions.
- The deployment snippet used an outdated node-cache image tag and older security context. Updated it to match the current upstream manifest's `registry.k8s.io/dns/k8s-dns-node-cache:1.26.8` image and `NET_ADMIN` capability.
- The DaemonSet excerpt used an incorrect `-upstreamsvc` value and Corefile path. Updated them to `kube-dns-upstream` and `/etc/Corefile`, matching the upstream manifest.
- The architecture section implied that all pods always get `/etc/resolv.conf` changed to the link-local IP. Clarified that kubelet changes are required for IPVS mode, while iptables mode can listen on both the kube-dns service IP and the node-local IP.
- The tuning example bound CoreDNS to `169.254.20.11` without configuring NodeLocal DNSCache to own that IP. Removed the extra bind address.
- The bypass section mentioned pod annotations for DNS bypass, but Kubernetes DNS override is done with `dnsConfig` and `dnsPolicy`. Removed the annotation claim and added an iptables-mode caveat.
- The metrics example used `coredns_cache_misses_total`, which CoreDNS documents as deprecated. Updated the example to use `coredns_cache_requests_total` alongside cache hits.
- The performance claims used precise percentage and microsecond improvements without an official basis. Reworded them as expected qualitative benefits that depend on cache hit rate and workload behavior.
- The troubleshooting section described packet-filtering rules as DNS redirects. Reworded it because NodeLocal DNSCache rule behavior differs by kube-proxy mode.

## Review Notes
The post is technically relevant and has been corrected against official Kubernetes, CoreDNS, and Prometheus Operator documentation. Managed Kubernetes distributions can expose provider-specific enablement paths, so provider documentation should still be checked before applying this manually on EKS, GKE, or AKS.
