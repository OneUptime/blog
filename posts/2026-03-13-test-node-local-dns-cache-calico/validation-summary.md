# Validation Summary: How to Test Node Local DNS Cache with Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- Calico GlobalNetworkPolicy
- Prometheus Operator PrometheusRule
- kubectl

## Sources Consulted
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- CoreDNS Prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS 1.8.5 release notes for cache metric deprecation: https://coredns.io/2021/09/10/coredns-1.8.5-release/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The original cache hit-rate command used a `kubectl exec` + `wget` pattern that depends on tools being present inside the NodeLocal DNSCache container. Changed it to use `kubectl port-forward` and `curl` from the local environment.
- The original cache hit-rate command calculated misses from `coredns_cache_misses_total`, which CoreDNS deprecated in 1.8.5. Updated the calculation to use `coredns_cache_requests_total - coredns_cache_hits_total` semantics by dividing hits by total cache requests.
- The introduction claimed cached DNS latency is reduced from milliseconds to microseconds. Official Kubernetes documentation states that NodeLocal DNSCache improves latency but does not guarantee that specific magnitude, so the wording was softened.
- The conclusion stated that cache pod failures would cause fallback to CoreDNS. Kubernetes documentation notes that unhealthy NodeLocal DNSCache pods can cause DNS downtime when packet filtering rules point to the local pod, so the wording was changed to cover DNS interruption or CoreDNS fallback depending on the deployment path.

## Review Notes
- The Calico GlobalNetworkPolicy syntax is valid, and `types: [Egress]` is optional because Calico defaults policy type from the presence of egress rules.
- The PrometheusRule CRD syntax is valid, assuming the Prometheus Operator CRDs are installed and the Prometheus instance selects the rule by namespace and labels.
- The link-local DNS IP `169.254.20.10` is a common NodeLocal DNSCache example value, but clusters may use a different local listen address.
