# Validation Summary: How to configure Kubernetes Services with IPVS scheduling algorithms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- kube-proxy
- IPVS proxy mode
- Linux kernel IPVS modules
- ipvsadm
- Prometheus Node Exporter

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, including IPVS proxy mode, scheduler options, session affinity, and current IPVS deprecation note: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API reference for `KubeProxyConfiguration` and `KubeProxyIPVSConfiguration`: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes Service API reference for `sessionAffinity` and `sessionAffinityConfig.clientIP.timeoutSeconds`: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes IPVS-based in-cluster load balancing deep dive for kube-proxy IPVS behavior, NAT mode, session affinity persistence, and `ipvsadm` output examples: https://kubernetes.io/blog/2018/07/09/ipvs-based-in-cluster-load-balancing-deep-dive/
- Prometheus Node Exporter documentation for the IPVS collector: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter IPVS collector source for metric names: https://raw.githubusercontent.com/prometheus/node_exporter/master/collector/ipvs_linux.go

## Issues Found
- Added the current Kubernetes caveat that IPVS proxy mode is deprecated and nftables mode is recommended for new eligible Linux clusters.
- Corrected the scheduler list. The post said IPVS supports ten algorithms and Kubernetes commonly uses five; current Kubernetes docs list additional supported IPVS schedulers, including `wrr`, `wlc`, `lblc`, `lblcr`, `nq`, and `mh`.
- Removed the misleading `excludeCIDRs` example for cluster DNS. Kubernetes documents `excludeCIDRs` as cleanup protection for IPVS services the proxier should not touch, not as a way to exclude a Kubernetes Service from proxying.
- Fixed the nginx Service and Deployment example. The original Service targeted port 8080, but the stock nginx image listens on port 80 unless reconfigured.
- Corrected the IPVS stats explanation. `ActiveConn` shows active connections; `InActConn` shows inactive connections.
- Softened source hashing claims. Source hashing does not guarantee permanent stickiness when the backend set changes, and Kubernetes `sessionAffinity: ClientIP` in IPVS mode is implemented by kube-proxy as IPVS persistence rather than being a separate application-level control layer.
- Corrected destination hashing guidance. For ordinary ClusterIP Services, the destination is usually the Service virtual IP, so destination hashing can concentrate traffic and is mainly relevant to specialized setups where the destination address varies.
- Corrected weighted round-robin behavior. Kubernetes does not derive IPVS weights from pod resource requests; kube-proxy programs endpoints with equal weights, so `wrr` behaves like `rr` unless weights are changed outside Kubernetes.
- Fixed the manual `ipvsadm` weight example so the command and comment both describe a 10x weight.

## Review Notes
The post remains technically relevant, but readers should treat IPVS mode as legacy for new clusters because current Kubernetes documentation marks it deprecated and recommends nftables mode where supported.
