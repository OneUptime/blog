# How to Collect DNS Resolution Metrics with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, DNS, Network, Resolution, Metrics, Observability, Monitoring

Description: Learn how to collect DNS resolution metrics using the OpenTelemetry Collector to monitor query latency, failure rates, and resolver health.

---

DNS resolution is one of those invisible dependencies that affects every networked application. Every HTTP request, database connection, and API call starts with a DNS lookup. When DNS is slow, everything is slow. When DNS fails, everything fails. Despite this, most teams do not actively monitor DNS resolution performance. They only discover DNS problems after applications start timing out or throwing connection errors.

The OpenTelemetry Collector provides tools to monitor DNS from two angles: actively probing DNS resolvers to measure query performance, and passively collecting metrics from DNS server software. This post covers both approaches so you can build comprehensive DNS observability.

## Why DNS Monitoring Matters

A typical web request involves multiple DNS lookups. Your application resolves the API endpoint. The API resolves its database hostname. The database resolves its replication peer. If any of these lookups is slow or fails, the entire request chain suffers. DNS caching helps, but cached entries expire, and the first request after expiration pays the full lookup cost.

Common DNS problems include:

- Resolver latency spikes caused by upstream DNS server overload
- Cache poisoning or stale records after infrastructure changes
- NXDOMAIN responses for services that should exist (misconfigured records)
- Timeout failures when the resolver is unreachable
- Slow propagation of DNS changes during migrations

```mermaid
graph LR
    A[Application] -->|DNS Query| B[Local Resolver]
    B -->|Cache Miss| C[Recursive Resolver]
    C -->|Query| D[Root DNS]
    C -->|Query| E[TLD DNS]
    C -->|Query| F[Authoritative DNS]
    G[OTel Collector] -->|Active Probes| B
    G -->|Active Probes| C
    G -->|Export Metrics| H[OneUptime]
```

## Active DNS Monitoring with the HTTP Check Receiver

The simplest way to monitor DNS resolution is to use the collector's `httpcheck` receiver, which performs HTTP checks that inherently include DNS resolution time. However, for pure DNS monitoring, we can use a combination of the `dns` check in the `network` receiver approach.

A more direct method uses a custom script with the `script` processor or the `receiver_creator` pattern. But the most practical approach for most teams is using the `health_check` extension combined with a simple DNS probe script that feeds metrics back into the collector.

Let me show you the most effective approach using the `prometheus` receiver to scrape a lightweight DNS probe exporter, along with the collector's own DNS-aware health checking.

First, set up a DNS probe that the collector can scrape:

```yaml
# config.yaml - DNS monitoring with active probes
receivers:
  # Use the httpcheck receiver to monitor endpoints
  # DNS resolution time is included in the connection metrics
  httpcheck:
    targets:
      # Monitor critical internal services via their DNS names
      - endpoint: "http://api.internal.company.com/health"
        method: GET
      - endpoint: "http://database.internal.company.com:8080/health"
        method: GET
      - endpoint: "http://cache.internal.company.com:6379"
        method: GET
    collection_interval: 30s

  # Collect DNS server metrics if running your own resolver
  prometheus/dns:
    config:
      scrape_configs:
        # CoreDNS metrics (if using CoreDNS as your resolver)
        - job_name: "coredns"
          scrape_interval: 15s
          static_configs:
            - targets: ["coredns-1.internal:9153", "coredns-2.internal:9153"]

        # BIND/named metrics (if using BIND as your resolver)
        - job_name: "bind"
          scrape_interval: 30s
          metrics_path: "/metrics"
          static_configs:
            - targets: ["bind-1.internal:9119"]

processors:
  batch:
    timeout: 10s
    send_batch_size: 512

  resource:
    attributes:
      - key: service.name
        value: "dns-monitoring"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers: [httpcheck, prometheus/dns]
      processors: [resource, batch]
      exporters: [otlp]
```

The `httpcheck` receiver measures the full HTTP connection lifecycle, which includes DNS resolution as the first step. While it does not separate DNS time from TCP connection time, a spike in connection time that correlates across multiple endpoints strongly suggests a DNS issue.

## Monitoring CoreDNS

If you run Kubernetes or use CoreDNS as your internal resolver, it exposes excellent metrics through its Prometheus plugin. These metrics give you direct visibility into DNS query handling:

```yaml
# CoreDNS Corefile configuration
# Enable the prometheus plugin to expose metrics
.:53 {
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    log
    errors
}
```

The key CoreDNS metrics to monitor:

```yaml
# Important CoreDNS metrics exposed on :9153/metrics
#
# coredns_dns_requests_total
#   Total DNS requests by server, zone, protocol (tcp/udp), and type (A, AAAA, etc.)
#
# coredns_dns_responses_total
#   Total responses by response code (NOERROR, NXDOMAIN, SERVFAIL, REFUSED)
#
# coredns_dns_request_duration_seconds
#   Histogram of request processing time
#
# coredns_dns_response_size_bytes
#   Histogram of response sizes
#
# coredns_cache_hits_total
#   Cache hit count by cache type (success, denial)
#
# coredns_cache_misses_total
#   Cache miss count - indicates lookups requiring upstream resolution
#
# coredns_forward_requests_total
#   Requests forwarded to upstream resolvers
#
# coredns_forward_responses_total
#   Responses received from upstream, by response code
```

The cache hit ratio is particularly valuable. Calculate it as `cache_hits / (cache_hits + cache_misses)`. A high cache hit ratio (above 80%) means most DNS lookups are answered locally without going upstream. A suddenly dropping cache hit ratio could mean TTLs were lowered, new services are being deployed rapidly, or the cache was flushed.

## Monitoring BIND DNS Servers

For traditional BIND deployments, use the `bind_exporter` to expose metrics in Prometheus format:

```bash
# Install and run the BIND exporter
# It reads BIND's statistics channel and converts to Prometheus format
./bind_exporter --bind.stats-url="http://localhost:8053" --web.listen-address=":9119"
```

Configure BIND to enable the statistics channel:

```text
// named.conf - Enable BIND statistics
statistics-channels {
    inet 127.0.0.1 port 8053 allow { 127.0.0.1; };
};
```

Key BIND metrics include query counts by type, recursive query performance, cache sizes, and zone transfer statistics. These are exposed through the exporter and scraped by the collector's Prometheus receiver.

## Building a DNS Health Dashboard

A well-designed DNS dashboard should surface problems quickly. Here is a suggested layout:

```text
Row 1: DNS Health Overview
- Query success rate (NOERROR responses / total responses)
- Average query latency (p50 and p99)
- Queries per second (total throughput)

Row 2: Resolution Performance
- Query latency distribution (histogram)
- Cache hit ratio over time
- Upstream resolver response time

Row 3: Error Analysis
- NXDOMAIN responses by queried domain (identifies misconfigurations)
- SERVFAIL responses over time (indicates resolver or upstream problems)
- REFUSED responses (indicates ACL or configuration issues)

Row 4: Infrastructure
- Queries per resolver node (load distribution)
- Cache size over time
- Forward request rate (upstream dependency)
```

## Alerting on DNS Issues

DNS alerts need to be fast because DNS failures cascade quickly:

```yaml
# DNS alerting rules
- alert: DNSHighLatency
  # Average query processing time exceeds 100ms
  condition: coredns_dns_request_duration_seconds_avg > 0.1
  for: 2m
  severity: warning
  description: "DNS query latency is elevated"

- alert: DNSHighSERVFAIL
  # More than 1% of responses are SERVFAIL
  condition: rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]) / rate(coredns_dns_responses_total[5m]) > 0.01
  for: 1m
  severity: critical
  description: "DNS SERVFAIL rate exceeds 1%"

- alert: DNSCacheMissSpike
  # Cache miss rate doubled compared to baseline
  condition: rate(coredns_cache_misses_total[5m]) > 2 * avg_over_time(rate(coredns_cache_misses_total[5m])[1h:])
  for: 5m
  severity: warning
  description: "DNS cache miss rate has spiked"

- alert: DNSResolverDown
  # No queries processed by a resolver
  condition: rate(coredns_dns_requests_total[5m]) == 0
  for: 2m
  severity: critical
  description: "DNS resolver appears to be down"
```

The SERVFAIL alert fires at just 1% because even a small SERVFAIL rate can affect many applications. A SERVFAIL means the resolver could not answer the query at all, which typically results in application-level timeouts.

## Kubernetes DNS Monitoring

In Kubernetes environments, DNS is especially critical because every service-to-service call goes through the cluster DNS. Monitor the kube-dns or CoreDNS pods with additional Kubernetes-specific metrics:

```yaml
receivers:
  prometheus/kube_dns:
    config:
      scrape_configs:
        - job_name: "kube-dns"
          scrape_interval: 15s
          kubernetes_sd_configs:
            - role: pod
          relabel_configs:
            # Only scrape pods with the prometheus.io/scrape annotation
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
              action: keep
              regex: true
            # Target CoreDNS pods
            - source_labels: [__meta_kubernetes_pod_label_k8s_app]
              action: keep
              regex: kube-dns
            # Use the prometheus port
            - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
              action: replace
              target_label: __address__
              regex: (.+)
              replacement: "${1}:9153"
```

Pay special attention to the `coredns_forward_responses_total` metric with SERVFAIL responses. In Kubernetes, this usually means the upstream DNS (your corporate resolver or cloud provider DNS) is having problems, which affects all pods trying to resolve external names.

## Troubleshooting DNS Collection

If the collector is not receiving DNS metrics, start with the basics. Can the collector reach the DNS metrics endpoint? Use `curl` to test connectivity to the Prometheus endpoint on your DNS server.

For CoreDNS, verify that the `prometheus` plugin is loaded and the metrics port is accessible. The plugin must appear in the Corefile for each server block where you want metrics.

For the `httpcheck` receiver, make sure the target endpoints are resolvable from the collector's network. If the collector itself cannot resolve DNS names, it cannot monitor them. Consider using IP addresses for the collector's own OTLP exporter endpoint to avoid a circular dependency.

## Conclusion

DNS monitoring belongs in every observability stack, and the OpenTelemetry Collector makes it practical to implement. Use the `httpcheck` receiver for synthetic DNS probing and the Prometheus receiver for scraping metrics from CoreDNS, BIND, or other DNS server software. Focus your alerting on SERVFAIL rates, query latency, and cache health. These metrics will tell you about DNS problems before your users start complaining about slow or broken applications.
