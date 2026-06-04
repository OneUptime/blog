# Validation Summary: How to Configure CoreDNS Autopath for Faster DNS Resolution in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes DNS for Services and Pods
- CoreDNS
- CoreDNS `autopath`, `kubernetes`, `prometheus`, `cache`, `forward`, and `reload` plugins
- Kubernetes ConfigMaps and Pods
- NodeLocal DNSCache
- Prometheus metrics
- `kubectl`
- `nslookup`, `dnsperf`, and `tcpdump`

## Sources Consulted
- CoreDNS `autopath` plugin documentation: https://coredns.io/plugins/autopath/
- CoreDNS `kubernetes` plugin documentation, including AutoPath requirements: https://coredns.io/plugins/kubernetes/
- CoreDNS `prometheus` plugin metrics documentation: https://coredns.io/plugins/metrics/
- CoreDNS `cache` plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS manual, plugin chain and Corefile ordering behavior: https://coredns.io/manual/toc/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/

## Issues Found
- The post described autopath as caching search path queries. CoreDNS documents autopath as server-side search path completion, so the wording was corrected.
- The post implied autopath always turns four DNS queries into one. CoreDNS only optimizes matching positive search-path lookups; negative lookups can still fall back to client-side search behavior, so the claim was narrowed.
- The CoreDNS examples enabled `autopath @kubernetes` while leaving the Kubernetes plugin at `pods insecure`. CoreDNS requires `pods verified` for autopath to function properly with the Kubernetes plugin, so the snippets were updated and a note was added about the original pod IP requirement.
- The custom-zone autopath example used unsupported block syntax. CoreDNS documents the syntax as `autopath [ZONE...] RESOLV-CONF`, so it was changed to `autopath cluster.local @kubernetes`.
- The NodeLocal DNSCache section stated that it should simply be applied after autopath and that pods automatically use it. Kubernetes documents kube-proxy mode differences, and autopath depends on CoreDNS seeing the original pod IP. The section was corrected to describe NodeLocal DNSCache as something to evaluate alongside autopath, to start from the official manifest, and to distinguish iptables and IPVS behavior.
- The troubleshooting section said autopath must come after the Kubernetes plugin in the Corefile. CoreDNS documentation instead emphasizes the `pods verified` setting and original remote IP requirement, so the troubleshooting item was corrected.
- The tcpdump example described running on a node but used `kubectl exec` into a CoreDNS pod. The text was corrected to describe running inside a CoreDNS pod if tcpdump is available.

## Review Notes
- The article remains version-sensitive because managed Kubernetes distributions can customize CoreDNS, NodeLocal DNSCache, and kube-proxy behavior. Operators should validate CoreDNS source IP visibility before combining autopath with a node-local forwarding cache.
- Enabling `pods verified` increases CoreDNS memory use because the Kubernetes plugin must maintain a pod watch/cache.
