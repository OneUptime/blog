# Validation Summary: How to Diagnose CoreDNS Performance Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- CoreDNS
- Kubernetes DNS service discovery
- Prometheus metrics
- NodeLocal DNSCache
- kubectl

## Sources Consulted
- Kubernetes documentation: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters - https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes documentation: Autoscale the DNS Service in a Cluster - https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- Kubernetes kubectl reference: port-forward - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl reference: run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- CoreDNS prometheus plugin documentation - https://coredns.io/plugins/metrics/
- CoreDNS cache plugin documentation - https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation - https://coredns.io/plugins/forward/
- CoreDNS log plugin documentation - https://coredns.io/plugins/log/
- CoreDNS health plugin documentation - https://coredns.io/plugins/health/

## Issues Found
- The cache hit-rate guidance used `hits / (hits + misses)`. CoreDNS marks `coredns_cache_misses_total` as deprecated, so this was changed to use `coredns_cache_hits_total / coredns_cache_requests_total`.
- The cache example described `cache 30` as caching for exactly 30 seconds. CoreDNS treats this as an upper TTL cap, so the comment was changed to "up to 30 seconds."
- The `forward` plugin section described `expire` as upstream response caching. CoreDNS documents it as cached connection expiry, so the explanation was corrected.
- The `forward` plugin policy comment omitted `round_robin`. The comment now lists `random`, `round_robin`, and `sequential`.
- The NodeLocal DNSCache section applied the sample manifest directly from the URL. Kubernetes requires downloading the sample manifest, substituting placeholder values, and then creating it, so the commands were corrected for the iptables-mode path.
- The NodeLocal DNSCache verification text said it checked whether application pods were using the local cache, but the command only lists the `node-local-dns` pods. The wording was corrected, and the explanation now scopes CoreDNS cache-miss forwarding to cluster DNS names.
- The query-pattern section implied CoreDNS request metrics show the most queried domains. The documented request metric labels do not include queried domain names, so the guidance now limits metrics analysis to available labels and points readers to query logs for per-domain detail.
- The DNS amplification section searched logs for a phrase CoreDNS does not emit by default. It now shows a CoreDNS log format that includes response size and an `awk` filter for large numeric fields.
- The test-pod section said to install `dnsperf` but installed `bind-tools`. The text now verifies that `nslookup` is available, matching the command actually used in the example.
- The CoreDNS health check used `kubectl port-forward svc/kube-dns 8080:8080`, but the `kube-dns` Service commonly exposes DNS and metrics ports, not the health endpoint. The command now port-forwards the `coredns` Deployment directly.
- The probe inspection command grepped for `probes`, which does not match the usual `livenessProbe` and `readinessProbe` keys. It now uses an extended grep for both probe names.

## Review Notes
The post is technically relevant and remains a useful troubleshooting guide. Thresholds such as "healthy response under 10ms", cache hit-rate targets, and alert thresholds are operational heuristics rather than Kubernetes or CoreDNS guarantees; they should be tuned to each cluster's workload and infrastructure. `kubectl` was not installed in the local workspace, so CLI syntax was checked against the current official Kubernetes kubectl reference instead of local `--help` output.
