# How to Monitor DNS Resolution Latency and Failures with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DNS Monitoring, Latency, Network Observability

Description: Configure the OpenTelemetry Collector to monitor DNS resolution latency and detect failures that impact service connectivity and user experience.

DNS failures are one of those infrastructure problems that look like application problems. When DNS resolution is slow or broken, every service that depends on it starts timing out. Engineers chase application-level symptoms while the root cause sits in the network layer. Monitoring DNS resolution latency and failures directly gives you visibility into this critical dependency.

The OpenTelemetry Collector can monitor DNS health through the `dns` check receiver, giving you metrics that flow into your standard observability pipeline.

## Why DNS Monitoring Matters

A DNS lookup that takes 500ms instead of 5ms adds 500ms to every outbound connection your service makes. If a service resolves 10 different hostnames during a request lifecycle, that is 5 seconds of pure DNS overhead. And DNS failures - NXDOMAIN responses, timeouts, SERVFAIL - break connectivity entirely.

Most teams do not monitor DNS until a DNS-related outage burns them. By then, they have spent hours looking at the wrong dashboards.

## Configuring the DNS Check Receiver

The OpenTelemetry Collector Contrib distribution includes a receiver that performs DNS lookups at regular intervals and reports resolution time and success/failure metrics.

Here is a basic configuration:

```yaml
# collector-dns-check.yaml
# Monitor DNS resolution for critical service hostnames.
# The receiver performs A record lookups and reports latency and errors
# for each configured hostname.

receivers:
  dnscheck:
    targets:
      - hostname: "api.example.com"
        query_type: A
      - hostname: "db.example.com"
        query_type: A
      - hostname: "cache.example.com"
        query_type: A
      - hostname: "auth.example.com"
        query_type: AAAA
    collection_interval: 30s
    dns_server_address: ""     # empty means use system resolver

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

processors:
  batch:
    timeout: 10s

service:
  pipelines:
    metrics:
      receivers: [dnscheck]
      processors: [batch]
      exporters: [otlp]
```

This checks four hostnames every 30 seconds and reports the resolution time and any errors. Setting `dns_server_address` to empty uses the system's configured resolver, which matches what your applications experience.

## Monitoring Specific DNS Servers

In production environments, you often have multiple DNS servers - internal resolvers, cloud provider DNS, and public resolvers. Monitoring each gives you visibility into which resolver is causing problems:

```yaml
# collector-dns-multi-resolver.yaml
# Run the same DNS lookups against different resolvers to identify
# which specific DNS server is causing latency or failures.

receivers:
  # Check against internal DNS
  dnscheck/internal:
    targets:
      - hostname: "api.example.com"
        query_type: A
      - hostname: "db.internal.example.com"
        query_type: A
    collection_interval: 30s
    dns_server_address: "10.0.0.53:53"

  # Check against cloud provider DNS (e.g., AWS Route 53 resolver)
  dnscheck/cloud:
    targets:
      - hostname: "api.example.com"
        query_type: A
      - hostname: "rds.us-east-1.amazonaws.com"
        query_type: A
    collection_interval: 30s
    dns_server_address: "169.254.169.253:53"

  # Check against public DNS for external resolution comparison
  dnscheck/public:
    targets:
      - hostname: "api.example.com"
        query_type: A
    collection_interval: 30s
    dns_server_address: "8.8.8.8:53"

processors:
  # Tag each check with its resolver for grouping in dashboards
  resource/internal:
    attributes:
      - key: dns.resolver
        value: "internal"
        action: upsert
  resource/cloud:
    attributes:
      - key: dns.resolver
        value: "cloud"
        action: upsert
  resource/public:
    attributes:
      - key: dns.resolver
        value: "public"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics/internal:
      receivers: [dnscheck/internal]
      processors: [resource/internal, batch]
      exporters: [otlp]
    metrics/cloud:
      receivers: [dnscheck/cloud]
      processors: [resource/cloud, batch]
      exporters: [otlp]
    metrics/public:
      receivers: [dnscheck/public]
      processors: [resource/public, batch]
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
        expr: rate(dnscheck_error_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "DNS resolution failing for {{ $labels.dns_hostname }}"
          description: "DNS lookups for {{ $labels.dns_hostname }} on resolver {{ $labels.dns_resolver }} are returning errors."

      # Latency degradation - resolution taking too long
      - alert: DNSResolutionSlow
        expr: dnscheck_duration_ms > 100
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "DNS resolution slow for {{ $labels.dns_hostname }}"
          description: "Resolution time is {{ $value }}ms, normally under 10ms."

      # Complete resolver failure - all lookups failing on one resolver
      - alert: DNSResolverDown
        expr: >
          count by (dns_resolver) (rate(dnscheck_error_total[5m]) > 0)
          == count by (dns_resolver) (dnscheck_duration_ms)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "DNS resolver {{ $labels.dns_resolver }} appears to be down"
```

The `DNSResolverDown` alert triggers when every hostname checked against a specific resolver is failing. That pattern strongly suggests the resolver itself is the problem, not individual DNS records.

## Correlating DNS Latency with Application Performance

The real power of DNS monitoring through OpenTelemetry is correlation. When DNS latency spikes, you can cross-reference that with application trace data to see the downstream impact.

Here is a simple Grafana dashboard query structure:

```
# Panel 1: DNS Resolution Latency by Hostname
# Shows resolution time trend for each monitored hostname
dnscheck_duration_ms{dns_resolver="internal"}

# Panel 2: Application HTTP Client Latency
# Shows the connection establishment time from application traces
histogram_quantile(0.95, rate(http_client_duration_bucket[5m]))

# Panel 3: Overlay both
# When DNS latency spikes coincide with HTTP client latency spikes,
# you have your root cause
```

## Monitoring DNS TTL Behavior

A useful extension is to track DNS record TTL values. Short TTLs mean more frequent resolution, which amplifies any DNS latency issues. While the standard `dnscheck` receiver does not emit TTL as a metric, you can supplement it with a custom script that runs as a subprocess:

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
