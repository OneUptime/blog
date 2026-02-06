# How to Monitor CoreDNS Query Latency, Cache Hit Rates, and DNS Request Types with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CoreDNS, DNS Monitoring, Query Latency, Kubernetes

Description: Monitor CoreDNS query latency, cache hit rates, and DNS request types using the OpenTelemetry Collector for Kubernetes DNS visibility.

CoreDNS is the default DNS server in Kubernetes, resolving every service name lookup, external domain query, and headless service resolution. DNS issues cause subtle application failures that are hard to diagnose without metrics. Monitoring CoreDNS query latency, cache hit rates, and request types with the OpenTelemetry Collector gives you visibility into this critical infrastructure component.

## Why CoreDNS Monitoring Matters

Every time a pod makes an HTTP request to a service name like `payment-service.default.svc.cluster.local`, CoreDNS handles the resolution. If CoreDNS is slow or returning errors, every service-to-service call suffers. Common CoreDNS issues include:

- High query latency from upstream DNS servers
- Cache misses causing excessive external lookups
- NXDOMAIN responses from misconfigured service names
- Resource exhaustion from too many concurrent queries

## Key CoreDNS Metrics

### Query Latency
- `coredns_dns_request_duration_seconds` - Histogram of DNS request latency by server, zone, and type
- `coredns_dns_response_size_bytes` - Histogram of DNS response sizes

### Cache Performance
- `coredns_cache_hits_total` - Number of cache hits by type (success, denial)
- `coredns_cache_misses_total` - Number of cache misses
- `coredns_cache_entries` - Current number of cache entries
- `coredns_cache_evictions_total` - Number of cache evictions

### Request Breakdown
- `coredns_dns_requests_total` - Total DNS requests by protocol, family, and type
- `coredns_dns_responses_total` - Total DNS responses by rcode (NOERROR, NXDOMAIN, SERVFAIL)
- `coredns_forward_requests_total` - Requests forwarded to upstream servers

## Collector Configuration

```yaml
receivers:
  prometheus/coredns:
    config:
      scrape_configs:
        - job_name: "coredns"
          scrape_interval: 15s
          # CoreDNS pods in Kubernetes expose metrics on port 9153
          kubernetes_sd_configs:
            - role: pod
              namespaces:
                names: ["kube-system"]
          relabel_configs:
            # Only scrape CoreDNS pods
            - source_labels: [__meta_kubernetes_pod_label_k8s_app]
              action: keep
              regex: "kube-dns"
            # Use the metrics port
            - source_labels: [__meta_kubernetes_pod_ip]
              target_label: __address__
              replacement: "$1:9153"
            # Add pod name as a label
            - source_labels: [__meta_kubernetes_pod_name]
              target_label: pod

processors:
  resource/coredns:
    attributes:
      - key: service.name
        value: "coredns"
        action: upsert

  # Focus on the most useful metrics
  filter/coredns-essentials:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - "coredns_dns_request_duration_seconds.*"
          - "coredns_dns_requests_total"
          - "coredns_dns_responses_total"
          - "coredns_cache_.*"
          - "coredns_forward_.*"
          - "coredns_panics_total"
          - "coredns_health_request_failures_total"
          - "process_.*"

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/coredns]
      processors: [resource/coredns, filter/coredns-essentials, batch]
      exporters: [otlp]
```

## Computing Cache Hit Rate

The cache hit rate is one of the most useful derived metrics. You can compute it in your backend, but you can also tag it at the Collector level:

```yaml
# Cache hit rate = hits / (hits + misses)
# This is best computed in your observability backend using the raw counters:
# coredns_cache_hits_total and coredns_cache_misses_total

# At the Collector level, you can add useful tags
processors:
  transform/coredns-tags:
    metric_statements:
      - context: datapoint
        statements:
          # Tag cache metrics with the cache type
          - set(attributes["cache.status"], "hit") where metric.name == "coredns_cache_hits_total"
          - set(attributes["cache.status"], "miss") where metric.name == "coredns_cache_misses_total"
```

## Monitoring Forward Request Performance

CoreDNS forwards requests it cannot resolve locally to upstream DNS servers. Monitor this for external DNS issues:

```yaml
# Key forward metrics:
# coredns_forward_requests_total - Total forwarded requests
# coredns_forward_responses_total - Total responses from upstreams (by rcode)
# coredns_forward_request_duration_seconds - Latency of forwarded requests
# coredns_forward_healthcheck_failures_total - Upstream health check failures
# coredns_forward_max_concurrent_rejects_total - Requests rejected due to concurrency limit
```

## Static Target Configuration

If you are not using Kubernetes service discovery, configure targets statically:

```yaml
receivers:
  prometheus/coredns:
    config:
      scrape_configs:
        - job_name: "coredns"
          scrape_interval: 15s
          static_configs:
            - targets:
                - "10.244.0.2:9153"
                - "10.244.0.3:9153"
              labels:
                cluster: "production"
```

To find CoreDNS pod IPs:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide
```

## Alerting Rules

Set up alerts for DNS issues that impact applications:

```
# Critical: CoreDNS is returning SERVFAIL responses
# Rate of coredns_dns_responses_total{rcode="SERVFAIL"} > 0

# Warning: High query latency (p99 > 100ms)
# coredns_dns_request_duration_seconds p99 > 0.1

# Warning: Cache hit rate below 80%
# coredns_cache_hits_total / (coredns_cache_hits_total + coredns_cache_misses_total) < 0.8

# Warning: Forward health check failures
# Rate of coredns_forward_healthcheck_failures_total > 0

# Critical: CoreDNS panics
# Rate of coredns_panics_total > 0
```

## Correlating DNS Issues with Application Performance

When you see DNS latency spikes, correlate them with application trace data. If your application traces include DNS resolution time, you can build dashboards that show the relationship:

```
Application latency spike -> DNS resolution slow -> CoreDNS forward latency high -> Upstream DNS issue
```

Having both CoreDNS metrics and application traces in the same backend makes this correlation possible.

CoreDNS monitoring is often overlooked but is critical for Kubernetes cluster health. DNS issues affect every service in the cluster, and without metrics you are left guessing when applications report intermittent connection failures. The OpenTelemetry Collector makes it straightforward to collect these metrics alongside your application telemetry.
