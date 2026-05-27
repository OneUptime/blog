# Validation Summary: How Kubernetes DNS-Based Service Discovery Works

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DNS
- Kubernetes Services and Pods
- CoreDNS
- DNS A/AAAA and SRV records
- kubectl
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes documentation: Using CoreDNS for Service Discovery - https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Kubernetes documentation: Autoscale the DNS Service in a Cluster - https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- CoreDNS documentation: kubernetes plugin - https://coredns.io/plugins/kubernetes/
- CoreDNS documentation: health plugin - https://coredns.io/plugins/health/
- CoreDNS documentation: prometheus plugin - https://coredns.io/plugins/metrics/
- CoreDNS documentation: cache plugin - https://coredns.io/plugins/cache/
- CoreDNS documentation: forward plugin - https://coredns.io/plugins/forward/

## Issues Found
- The introduction implied IPs change with every pod restart. Kubernetes Pods are replaced rather than restarted in place, and Service ClusterIPs are stable for the Service lifetime, so the text now specifically refers to pod IPs changing when pods are replaced.
- The short-name examples said a non-trailing-dot fully qualified service name takes one DNS query. With the common Kubernetes `ndots:5` resolver option, `user-api.production.svc.cluster.local` has fewer than 5 dots and can still be tried through search domains first. The example now distinguishes the service name from the absolute FQDN with a trailing dot.
- The CoreDNS Corefile example used `health { lazystart }`, which is not valid syntax for the CoreDNS health plugin. It now uses the documented `lameduck 5s` option.
- The Pod A record section stated broadly that pods get IP-based DNS records. Kubernetes documents these records as implementation-dependent, and CoreDNS provides them depending on pod mode, so the comment now states that caveat.
- The cache hit-rate metric used `coredns_dns_requests_total` as the denominator. CoreDNS documents `coredns_cache_requests_total` for cache request counts, so the denominator was corrected.
- The DNS autoscaler ConfigMap command used `dns-autoscaler`. Kubernetes DNS autoscaling documentation uses `kube-dns-autoscaler`, so the command was corrected.

## Review Notes
The CoreDNS Corefile can vary by Kubernetes distribution and installation tool. The example is valid for common CoreDNS deployments, but readers should still inspect their cluster's `coredns` ConfigMap for the exact active configuration.
