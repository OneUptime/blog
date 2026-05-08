# Validation Summary: How to Validate Node Local DNS Cache with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- Calico
- kubectl
- DNS

## Sources Consulted
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Calico NodeLocal DNSCache documentation: https://docs.tigera.io/calico/latest/networking/configuring/node-local-dns-cache
- CoreDNS cache plugin metrics documentation: https://coredns.io/plugins/cache/

## Issues Found
- The introduction said DNS queries from pods are served by the local cache rather than crossing the network to CoreDNS. Updated this to clarify that NodeLocal DNSCache uses the node-local caching path and forwards cache misses to kube-dns/CoreDNS.
- The post stated cache hits should be sub-millisecond. Removed the hard latency guarantee because Kubernetes documents latency benefits, but does not guarantee a specific sub-millisecond threshold.
- The pod `resolv.conf` check assumed it should always show `169.254.20.10`. Updated the text to explain that IPVS mode should use the NodeLocal DNS IP, while iptables mode may still show the kube-dns service IP because node-local-dns can listen on both addresses.
- The DNS timing command used `time` directly through `kubectl exec`, which may be interpreted on the client side or fail depending on the container command path. Wrapped it in `sh -c` so timing runs inside the pod.
- The metrics command execed `wget` inside the node-local-dns pod, but the node-local-dns image is not guaranteed to include `wget`. Replaced it with `kubectl port-forward` and local `curl`.
- The metrics grep included `cache_misses`; CoreDNS documents `coredns_cache_misses_total` as deprecated. Updated the command to use `coredns_cache_hits_total` and `coredns_cache_requests_total`.
- The connectivity test used `nc` against TCP port 53, which does not validate normal DNS resolution through the cache. Replaced it with an explicit `nslookup` against the NodeLocal DNS IP.
- The Calico log command did not include `--all-pods=true` for a DaemonSet and assumed only the `calico-system` namespace. Updated the command and noted that manifest installs may use `kube-system`.
- The conclusion and Mermaid diagram repeated the overly strict `169.254.20.10` assumption. Updated them to refer to the NodeLocal DNS path instead.

## Review Notes
The example uses `169.254.20.10`, which is a common NodeLocal DNSCache local listen address but not mandatory. Kubernetes recommends choosing a non-conflicting local-scope address such as one from `169.254.0.0/16` for IPv4.
