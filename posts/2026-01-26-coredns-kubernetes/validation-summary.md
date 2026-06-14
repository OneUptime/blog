# Validation Summary: How to Use CoreDNS with Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS
- Kubernetes DNS
- Kubernetes Services and Pods
- CoreDNS Corefile plugins
- kubectl
- Prometheus metrics
- cluster-proportional-autoscaler

## Sources Consulted
- Kubernetes: Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes: DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Autoscale the DNS Service in a Cluster: https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- Kubernetes 1.13 release announcement: https://kubernetes.io/blog/2018/12/03/kubernetes-1-13-release-announcement/
- CoreDNS configuration manual: https://coredns.io/manual/configuration/
- CoreDNS plugin ordering documentation: https://coredns.io/manual/plugins/
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/
- CoreDNS hosts plugin: https://coredns.io/plugins/hosts/
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS log plugin: https://coredns.io/plugins/log/
- CoreDNS prometheus plugin: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin: https://coredns.io/plugins/cache/
- Kubernetes SIGs cluster-proportional-autoscaler: https://github.com/kubernetes-sigs/cluster-proportional-autoscaler

## Issues Found
- The post said internal Kubernetes DNS queries are resolved using the Kubernetes API. Updated this to clarify that CoreDNS resolves from Kubernetes service and pod data it watches through the API, rather than implying every lookup directly queries the API server.
- The hosts plugin example said to place `hosts` before the `kubernetes` plugin. CoreDNS plugin execution order is compiled into CoreDNS, not determined by Corefile ordering. Reworded the comment to focus on `fallthrough`, which is the relevant configuration behavior.
- The split-zone Corefile example handled only `cluster.local` in the server block while also configuring reverse zones in the `kubernetes` plugin. Updated the server block to include `in-addr.arpa` and `ip6.arpa`.
- The `prefer_udp` comment incorrectly described the option as "Use TCP if UDP fails." Updated it to match CoreDNS behavior: it prefers UDP for TCP client queries and retries truncated responses over TCP.
- The public DNS forwarding example commented about DNS over TLS but used plain DNS upstreams. Updated it to use `tls://8.8.8.8`, `tls://8.8.4.4`, and `tls_servername dns.google`.
- The `ndots` explanation attributed resolver behavior to Kubernetes and implied names with enough dots are only tried as absolute names. Updated it to describe resolver behavior more accurately.
- The cluster-proportional-autoscaler image tag omitted the `v` prefix and used an older release. Updated it to `registry.k8s.io/cpa/cluster-proportional-autoscaler:v1.10.3` and clarified that the Deployment requires corresponding ServiceAccount, RBAC, and ConfigMap resources.
- The metrics access example port-forwarded through `svc/kube-dns`, which may not expose the metrics port on all clusters. Updated it to port-forward the `deployment/coredns` target.
- The metrics table used deprecated `coredns_cache_misses_total` and `coredns_forward_requests_total`. Replaced them with the current cache request counter and forward request count source.

## Review Notes
- The guide uses `cluster.local` and `10.96.0.10` as common defaults, but actual cluster domains and DNS service IPs can vary by installation.
- The CoreDNS service is commonly named `kube-dns` for compatibility even when CoreDNS backs it, which the post describes correctly.
- The examples remain illustrative and should be tested in a non-production cluster before use, especially CoreDNS ConfigMap changes.
