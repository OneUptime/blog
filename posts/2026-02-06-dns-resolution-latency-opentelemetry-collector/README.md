# How to Monitor DNS Resolution Latency and Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DNS Monitoring, Latency, Network Observability

Description: Configure the OpenTelemetry Collector to monitor DNS resolution latency and detect failures that impact service connectivity and user experience.

DNS failures are one of those infrastructure problems that look like application problems. When DNS resolution is slow or broken, every service that depends on it starts timing out. Engineers chase application-level symptoms while the root cause sits in the network layer. Monitoring DNS resolution latency and failures directly gives you visibility into this critical dependency.

The OpenTelemetry Collector can monitor DNS health by scraping DNS probe metrics from Prometheus Blackbox Exporter with the `prometheus` receiver, giving you metrics that flow into your standard observability pipeline.

## Why DNS Monitoring Matters

A DNS lookup that takes 500ms instead of 5ms adds 500ms to every outbound connection your service makes. If a service resolves 10 different hostnames during a request lifecycle, that is 5 seconds of pure DNS overhead. And DNS failures - NXDOMAIN responses, timeouts, SERVFAIL - break connectivity entirely.

Most teams do not monitor DNS until a DNS-related outage burns them. By then, they have spent hours looking at the wrong dashboards.

## Configuring DNS Probes

The OpenTelemetry Collector includes a Prometheus receiver that can scrape Blackbox Exporter. Blackbox Exporter performs DNS probes at scrape time and reports resolution time and success/failure metrics.

Here is a basic configuration:

```yaml
# blackbox.yml

# Monitor DNS resolution for critical service hostnames.
# Blackbox Exporter performs DNS lookups and reports latency and errors
# for each configured hostname.

modules:
  dns_api_a:
    prober: dns
    dns:
      query_name: "api.example.com"
      query_type: "A"
  dns_db_a:
    prober: dns
    dns:
      query_name: "db.example.com"
      query_type: "A"
  dns_cache_a:
    prober: dns
    dns:
      query_name: "cache.example.com"
      query_type: "A"
  dns_auth_aaaa:
    prober: dns
    dns:
      query_name: "auth.example.com"
      query_type: "AAAA"
```

```yaml
# collector-dns-check.yaml

receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "dns-blackbox"
          scrape_interval: 30s
          metrics_path: /probe
          static_configs:
            - targets: ["127.0.0.53:53"]
              labels:
                dns_resolver: "local"
                dns_hostname: "api.example.com"
                module: "dns_api_a"
            - targets: ["127.0.0.53:53"]
              labels:
                dns_resolver: "local"
                dns_hostname: "db.example.com"
                module: "dns_db_a"
            - targets: ["127.0.0.53:53"]
              labels:
                dns_resolver: "local"
                dns_hostname: "cache.example.com"
                module: "dns_cache_a"
            - targets: ["127.0.0.53:53"]
              labels:
                dns_resolver: "local"
                dns_hostname: "auth.example.com"
                module: "dns_auth_aaaa"
          relabel_configs:
            - source_labels: [__address__]
              target_label: __param_target
            - source_labels: [module]
              target_label: __param_module
            - source_labels: [__param_target]
              target_label: instance
            - target_label: __address__
              replacement: "blackbox-exporter:9115"

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

processors:
  batch:
    timeout: 10s

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [otlp]
```

This checks four hostnames every 30 seconds and reports the resolution time and any errors. Set the DNS target to the resolver address your applications use, such as the local stub resolver on the same host or the internal resolver IP configured in production.

## Monitoring Specific DNS Servers

In production environments, you often have multiple DNS servers - internal resolvers, cloud provider DNS, and public resolvers. Monitoring each gives you visibility into which resolver is causing problems:

```yaml
# blackbox.yml
# Run the same DNS lookups against different resolvers to identify
# which specific DNS server is causing latency or failures.

modules:
  dns_api_a:
    prober: dns
    dns:
      query_name: "api.example.com"
      query_type: "A"
  dns_db_internal_a:
    prober: dns
    dns:
      query_name: "db.internal.example.com"
      query_type: "A"
  dns_rds_a:
    prober: dns
    dns:
      query_name: "rds.us-east-1.amazonaws.com"
      query_type: "A"
```

```yaml
# collector-dns-multi-resolver.yaml

receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "dns-blackbox"
          scrape_interval: 30s
          metrics_path: /probe
          static_configs:
            # Check against internal DNS
            - targets: ["10.0.0.53:53"]
              labels:
                dns_resolver: "internal"
                dns_hostname: "api.example.com"
                module: "dns_api_a"
            - targets: ["10.0.0.53:53"]
              labels:
                dns_resolver: "internal"
                dns_hostname: "db.internal.example.com"
                module: "dns_db_internal_a"

            # Check against cloud provider DNS (e.g., AWS Route 53 resolver)
            - targets: ["169.254.169.253:53"]
              labels:
                dns_resolver: "cloud"
                dns_hostname: "api.example.com"
                module: "dns_api_a"
            - targets: ["169.254.169.253:53"]
              labels:
                dns_resolver: "cloud"
                dns_hostname: "rds.us-east-1.amazonaws.com"
                module: "dns_rds_a"

            # Check against public DNS for external resolution comparison
            - targets: ["8.8.8.8:53"]
              labels:
                dns_resolver: "public"
                dns_hostname: "api.example.com"
                module: "dns_api_a"
          relabel_configs:
            - source_labels: [__address__]
              target_label: __param_target
            - source_labels: [module]
              target_label: __param_module
            - source_labels: [__param_target]
              target_label: instance
            - target_label: __address__
              replacement: "blackbox-exporter:9115"

processors:
  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch]
      exporters: [otlp]
```

When resolution latency spikes on the internal resolver but not on the cloud or public resolver, you immediately know where to look.

## Building Alerts for DNS Issues

DNS problems need fast detection because they cascade quickly. Here are alert rules tailored to DNS monitoring:

```yaml
# dns-alerts.yaml
# Alert on DNS resolution failures and latency spikes.
# These rules distinguish between hard failures and degradation.

groups:
  - name: dns-health
    rules:
      # Hard failure - DNS lookup returning errors
      - alert: DNSResolutionFailure
        expr: probe_success{job="dns-blackbox"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "DNS resolution failing for {{ $labels.dns_hostname }}"
          description: "DNS lookups for {{ $labels.dns_hostname }} on resolver {{ $labels.dns_resolver }} are returning errors."

      # Latency degradation - resolution taking too long
      - alert: DNSResolutionSlow
        expr: probe_dns_duration_seconds{job="dns-blackbox", phase="request"} > 0.1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "DNS resolution slow for {{ $labels.dns_hostname }}"
          description: "DNS request time is {{ $value }} seconds, normally under 0.01 seconds."

      # Complete resolver failure - all lookups failing on one resolver
      - alert: DNSResolverDown
        expr: >
          count by (dns_resolver) (probe_success{job="dns-blackbox"} == 0)
          == count by (dns_resolver) (probe_success{job="dns-blackbox"})
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "DNS resolver {{ $labels.dns_resolver }} appears to be down"
```

The `DNSResolverDown` alert triggers when every hostname checked against a specific resolver is failing. That pattern strongly suggests the resolver itself is the problem, not individual DNS records.

## Correlating DNS Latency with Application Performance

The real power of DNS monitoring through OpenTelemetry is correlation. When DNS latency spikes, you can cross-reference that with application metrics and traces to see the downstream impact.

Here is a simple Grafana dashboard query structure:

```text
# Panel 1: DNS Resolution Latency by Hostname
# Shows resolution time trend for each monitored hostname
probe_dns_duration_seconds{job="dns-blackbox", dns_resolver="internal", phase="request"}

# Panel 2: Application HTTP Client Latency
# Shows the 95th percentile HTTP client duration from application metrics
histogram_quantile(0.95, rate(http_client_duration_bucket[5m]))

# Panel 3: Overlay both
# When DNS latency spikes coincide with HTTP client latency spikes,
# you have your root cause
```

## Monitoring DNS TTL Behavior

A useful extension is to track DNS record TTL values. Short TTLs mean more frequent resolution, which amplifies any DNS latency issues. While Blackbox Exporter DNS probes do not emit TTL as a metric, you can supplement them with a custom script that runs periodically:

```bash
# dns_ttl_check.sh
# Quick script to check TTL values for critical hostnames.
# Run this periodically and push results to the collector via OTLP.

HOSTNAMES="api.example.com db.example.com cache.example.com"

for host in $HOSTNAMES; do
    TTL=$(dig +noall +answer "$host" | awk '{print $2}' | head -1)
    echo "dns.ttl{hostname=\"$host\"} $TTL"
done
```

Knowing that your database hostname has a 60-second TTL while your API hostname has a 300-second TTL helps you understand why DNS issues affect some services more than others.

DNS is invisible infrastructure until it breaks. By adding DNS monitoring to your OpenTelemetry pipeline, you gain visibility into a dependency that every service shares, and you catch problems before they cascade into widespread outages.
