# Validation Summary: How to Debug DNS Resolution Issues in Kubernetes with CoreDNS

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes (kube-system, services, pods, NetworkPolicy)
- CoreDNS (Corefile, plugins: errors, health, ready, kubernetes, prometheus, forward, cache, loop, reload, loadbalance, hosts, log, debug)
- DNS (resolv.conf, ndots, search domains, FQDN resolution)
- kubectl CLI
- nslookup / dig
- Prometheus (CoreDNS metrics and alerting rules)
- Debug tooling (nicolaka/netshoot, busybox)

## Sources Consulted
- CoreDNS cache plugin docs — https://coredns.io/plugins/cache/
- CoreDNS plugins index — https://coredns.io/plugins/
- Kubernetes "Using CoreDNS for Service Discovery" / administer-cluster docs — https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- Kubernetes DNS for Services and Pods — https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes 1.13 release notes (CoreDNS as default DNS server)

## Issues Found
1. **Outdated cache metric name** — The "Key metrics" example output listed `coredns_cache_size{server="dns://:53",type="success"} 1000`. The `coredns_cache_size` metric was deprecated and renamed; the current cache plugin exposes the cache-element count as `coredns_cache_entries{server, type, zones, view}`. Updated the example to `coredns_cache_entries` so the output reflects what a current CoreDNS instance actually emits. No other lines changed.

## Review Notes
- The claim "CoreDNS is the default DNS server in Kubernetes since version 1.13" is accurate — CoreDNS reached GA and became the default cluster DNS in Kubernetes 1.13. (Note: kubeadm fully dropped kube-dns support later, in 1.21, but that is a separate milestone and does not contradict the statement.)
- `coredns_cache_misses_total` (used in the metrics example) is officially deprecated — the docs recommend deriving misses from `coredns_cache_requests_total` minus `coredns_cache_hits_total` — but the metric is still emitted, so it was left as-is. Worth revisiting if the post is updated for a future CoreDNS major version.
- The `loadbalance` plugin description ("Randomizes answer order for load balancing") matches the official docs, which describe it as randomizing the order of A/AAAA/MX records.
- Plugin port numbers are correct: `health` :8080, `ready` :8181, `prometheus` :9153, and the kube-dns service exposing 53/UDP, 53/TCP, 9153/TCP.
- The NetworkPolicy egress example correctly ANDs `namespaceSelector` + `podSelector` within a single `to` entry to target kube-dns pods in kube-system.
- `kubectl get endpoints` still works but EndpointSlices are the modern API; this is a minor stylistic note, not an error.
- Cache TTL syntax (`cache 60 { success 9984 30; denial 9984 5 }`) and the stub/forward Corefile examples are syntactically valid.
