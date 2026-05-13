# Validation Summary: How to Migrate to Node Local DNS Cache with Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- Calico GlobalNetworkPolicy
- Prometheus Operator PrometheusRule
- kubectl

## Sources Consulted
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters, https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Calico documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Get started with Calico network policy, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- CoreDNS documentation: cache plugin metrics, https://coredns.io/plugins/cache/
- Prometheus Operator documentation: PrometheusRule API reference, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction claimed cached DNS latency drops from milliseconds to microseconds. Official Kubernetes documentation states NodeLocal DNSCache can improve DNS performance and latency, but does not guarantee a specific latency range. Changed the claim to a non-absolute performance statement.
- The NodeLocal DNSCache ConfigMap instructions implied direct edits are always supported. Kubernetes documentation notes the ConfigMap can be modified directly, but some cloud providers may not allow direct modification. Added that caveat.
- The cache hit rate command matched generic `cache_hits` and `cache_misses` metric names and used cache misses directly. CoreDNS exports `coredns_cache_hits_total` and `coredns_cache_requests_total`; `coredns_cache_misses_total` is deprecated. Updated the command to calculate hit rate from hits divided by requests and to handle zero requests.
- The Calico `GlobalNetworkPolicy` omitted an explicit `types: Egress` field. Calico can infer this from the egress rules, but adding it makes the policy intent clear and matches documented policy fields.
- The Calico policy example selected all endpoints and could restrict non-DNS egress if applied without other allow policies. Added a warning to ensure other required egress is allowed in the ordered Calico policy model.
- The conclusion said cache pod failures would fall back to higher-latency CoreDNS. Kubernetes documentation warns that NodeLocal DNSCache failures can cause DNS downtime until the pod restarts and packet filtering rules recover. Updated the conclusion to describe possible DNS interruption instead of guaranteed fallback.

## Review Notes
The PrometheusRule resource shape is valid for Prometheus Operator, but the `up{job="node-local-dns"}` selector depends on how the cluster's Prometheus scrape job is labeled.
