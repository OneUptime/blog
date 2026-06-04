# Validation Summary: How to Implement CoreDNS Prometheus Metrics and Monitoring for DNS Performance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- CoreDNS
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana dashboard JSON
- Bash DNS benchmarking
- kubectl

## Sources Consulted
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Replaced deprecated or outdated CoreDNS cache and forward metric references. `coredns_cache_misses_total` is deprecated in the CoreDNS cache plugin documentation, and `coredns_forward_requests_total`, `coredns_forward_responses_total`, and `coredns_forward_healthcheck_failures_total` are deprecated in the CoreDNS forward plugin documentation. The post now uses `coredns_cache_requests_total` and the documented `coredns_proxy_*` forward metrics.
- Corrected cache hit ratio formulas to divide cache hits by cache requests instead of total DNS requests. This matches the CoreDNS cache plugin metrics and avoids underreporting cache effectiveness when not every request is cacheable.
- Updated latency PromQL examples to aggregate histogram buckets with `sum(... ) by (le)` before `histogram_quantile`, and updated average latency to divide summed rates. This makes the examples produce cluster-level latency values instead of per-series quantiles.
- Changed alerting rules from a plain Kubernetes ConfigMap to a `monitoring.coreos.com/v1` `PrometheusRule`, which is the Prometheus Operator resource for rule management.
- Updated the cache capacity alert threshold from 30,000 to 9,000 entries because the CoreDNS cache plugin default capacity is 9,984 entries per cache unless explicitly configured higher.
- Fixed the benchmark Job command to invoke `bash`, because the script uses Bash arrays. Also corrected the sleep calculation so the loop targets the configured total QPS across all domains instead of multiplying it by the number of domains.

## Review Notes
- The ServiceMonitor example is valid for Prometheus Operator setups that select ServiceMonitors in the `kube-system` namespace and have CoreDNS pods labeled `k8s-app: kube-dns`.
- The Grafana ConfigMap remains a starter dashboard payload. Actual dashboard loading depends on the Grafana deployment's provisioning or sidecar configuration.
