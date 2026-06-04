# Validation Summary: How to Use CoreDNS Autopath Plugin to Reduce DNS Query Latency in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DNS
- CoreDNS
- CoreDNS autopath plugin
- CoreDNS kubernetes plugin
- CoreDNS cache plugin
- CoreDNS Prometheus metrics
- NodeLocal DNSCache
- kubectl

## Sources Consulted
- CoreDNS autopath plugin documentation: https://coredns.io/plugins/autopath/
- CoreDNS kubernetes plugin documentation, including AutoPath requirements: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns

## Issues Found
- The post used `pods insecure` in autopath examples. CoreDNS documents that Kubernetes-backed autopath requires the kubernetes plugin to use `pods verified`, so the examples and troubleshooting snippet were changed to `pods verified`.
- The post described autopath as modifying client search path information or providing hints. CoreDNS autopath performs server-side search path completion and may return a CNAME from the original searched name to the discovered answer, so the explanation was corrected.
- The cross-namespace DNS example used a bare short service name for a service in another namespace. Kubernetes DNS requires namespace-qualified service names for cross-namespace lookups, so the example was changed to `api-service.production`.
- The advanced autopath Corefile used an unsupported nested `zones` block. CoreDNS autopath syntax is `autopath [ZONE...] RESOLV-CONF`, so the example was corrected to `autopath cluster.local @kubernetes`.
- The cache optimization Corefile configured the `cache` plugin twice in one server block. CoreDNS documents that the cache plugin can only be used once per server block, so the duplicate `cache 30` directive was removed.
- The cache hit ratio Prometheus query divided cache hits by total DNS requests. CoreDNS exposes `coredns_cache_requests_total` for cache requests, so the query and alert expression were corrected to use that metric.
- The benchmark pod invoked a Bash script with `sh`, even though the script uses Bash arrays. The command was changed to `bash /scripts/benchmark.sh`.
- The verification step said `/etc/resolv.conf` should show a modified search path after enabling autopath. Autopath is server-side and does not modify the pod's resolver configuration, so the text was corrected.
- The NodeLocal DNSCache section claimed CoreDNS autopath would optimize cache misses forwarded from NodeLocal DNSCache. CoreDNS documents that Kubernetes-backed autopath requires CoreDNS to see the querying pod IP as the DNS packet's remote address, so the section now warns that NodeLocal DNSCache may prevent autopath from identifying the original pod.

## Review Notes
The remaining examples are generally valid for clusters where CoreDNS includes the autopath plugin and where CoreDNS receives DNS packets with the pod IP as the remote address. Autopath has documented Kubernetes caveats, including stale pod IP-to-namespace mappings during rapid IP reuse and incompatibility with pods running from Windows nodes; these caveats could be expanded in a future revision.
