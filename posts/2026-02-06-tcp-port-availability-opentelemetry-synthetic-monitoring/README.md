# How to Configure TCP Port Availability Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, TCP Monitoring, Synthetic Checks, Port Availability

Description: Configure TCP port availability monitoring using the OpenTelemetry Collector to detect connectivity issues before they impact application traffic.

HTTP health checks are great for web services, but plenty of critical infrastructure communicates over raw TCP - databases, message brokers, cache servers, custom protocol services. Monitoring TCP port availability tells you whether these services are accepting connections, independent of any application-level protocol.

The OpenTelemetry Collector Contrib distribution supports TCP checks through the `tcp_check` receiver, letting you verify that critical ports are open and responding within acceptable timeframes.

## Why TCP Checks Matter

An HTTP health check tells you the application layer is working. A TCP check tells you something more fundamental - is the service reachable on the network and accepting connections? These are different failure modes:

- A database might accept TCP connections on port 5432 but reject authentication
- A service might have its HTTP endpoint down but TCP port still open (half-alive state)
- A firewall change might block a port without anyone noticing until traffic fails

TCP checks catch network-layer and firewall issues that higher-level checks miss.

## Configuring TCP Checks in the Collector

The OpenTelemetry Collector Contrib distribution includes a `tcp_check` receiver that probes TCP ports at regular intervals:

```yaml
# collector-tcpcheck.yaml

# Monitor TCP port availability for critical infrastructure services.
# Each target specifies a host:port combination to probe.
# The receiver reports connection success, failure, and duration.

receivers:
  tcp_check:
    targets:
      - endpoint: "postgres-primary.internal:5432"
        dialer:
          timeout: 10s
      - endpoint: "postgres-replica.internal:5432"
        dialer:
          timeout: 10s
      - endpoint: "redis-cluster.internal:6379"
        dialer:
          timeout: 10s
      - endpoint: "kafka-broker-1.internal:9092"
        dialer:
          timeout: 10s
      - endpoint: "kafka-broker-2.internal:9092"
        dialer:
          timeout: 10s
      - endpoint: "kafka-broker-3.internal:9092"
        dialer:
          timeout: 10s
      - endpoint: "elasticsearch.internal:9200"
        dialer:
          timeout: 10s
      - endpoint: "rabbitmq.internal:5672"
        dialer:
          timeout: 10s
    collection_interval: 30s

processors:
  batch:
    timeout: 10s

  resource:
    attributes:
      - key: monitor.type
        value: "tcp_port_check"
        action: upsert

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [tcp_check]
      processors: [resource, batch]
      exporters: [otlp]
```

The `dialer.timeout` setting controls how long the receiver waits for a TCP connection to establish before marking the check as failed. Ten seconds is generous - most internal services should accept connections within a few hundred milliseconds.

## Grouping Checks by Service Tier

In production, not all TCP endpoints are equally critical. Your primary database going down is a different severity than a secondary cache node failing. Use resource attributes to encode this context:

```yaml
# collector-tcpcheck-tiered.yaml
# Separate TCP checks into tiers so alerting rules can apply
# different severity levels based on the importance of each target.

receivers:
  tcp_check/tier1:
    targets:
      - endpoint: "postgres-primary.internal:5432"
        dialer:
          timeout: 5s
      - endpoint: "kafka-broker-1.internal:9092"
        dialer:
          timeout: 5s
      - endpoint: "kafka-broker-2.internal:9092"
        dialer:
          timeout: 5s
      - endpoint: "kafka-broker-3.internal:9092"
        dialer:
          timeout: 5s
    collection_interval: 15s     # check critical services more frequently

  tcp_check/tier2:
    targets:
      - endpoint: "postgres-replica.internal:5432"
        dialer:
          timeout: 10s
      - endpoint: "redis-cluster.internal:6379"
        dialer:
          timeout: 10s
      - endpoint: "elasticsearch.internal:9200"
        dialer:
          timeout: 10s
    collection_interval: 30s

  tcp_check/tier3:
    targets:
      - endpoint: "dev-db.internal:5432"
        dialer:
          timeout: 15s
      - endpoint: "staging-api.internal:8080"
        dialer:
          timeout: 15s
    collection_interval: 60s

processors:
  resource/tier1:
    attributes:
      - key: service.tier
        value: "1"
        action: upsert
  resource/tier2:
    attributes:
      - key: service.tier
        value: "2"
        action: upsert
  resource/tier3:
    attributes:
      - key: service.tier
        value: "3"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics/tier1:
      receivers: [tcp_check/tier1]
      processors: [resource/tier1, batch]
      exporters: [otlp]
    metrics/tier2:
      receivers: [tcp_check/tier2]
      processors: [resource/tier2, batch]
      exporters: [otlp]
    metrics/tier3:
      receivers: [tcp_check/tier3]
      processors: [resource/tier3, batch]
      exporters: [otlp]
```

Tier 1 services get checked every 15 seconds with a 5-second timeout. Tier 3 services get checked every minute with a more lenient timeout. This keeps your check volume reasonable while giving critical services the attention they deserve.

## Alert Rules for TCP Checks

Here are alert rules that leverage the tiered approach:

```yaml
# tcp-alerts.yaml
# Alerting rules for TCP port availability checks.
# Severity is determined by service tier.

groups:
  - name: tcp-port-availability
    rules:
      # Tier 1 - page immediately
      - alert: Tier1TCPPortDown
        expr: tcpcheck_status{service_tier="1"} == 0
        for: 30s
        labels:
          severity: critical
          routing: pagerduty
        annotations:
          summary: "CRITICAL: {{ $labels.tcpcheck_endpoint }} is not accepting TCP connections"
          description: "Tier 1 service port has been unreachable for 30 seconds."

      # Tier 2 - alert but do not page
      - alert: Tier2TCPPortDown
        expr: tcpcheck_status{service_tier="2"} == 0
        for: 2m
        labels:
          severity: warning
          routing: slack
        annotations:
          summary: "WARNING: {{ $labels.tcpcheck_endpoint }} is not accepting TCP connections"

      # Connection latency degradation
      - alert: TCPConnectionSlow
        expr: tcpcheck_duration_milliseconds > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TCP connection to {{ $labels.tcpcheck_endpoint }} taking {{ $value }}ms"
          description: "Normal connection time is under 50ms. Possible network congestion or host overload."

      # Intermittent failures - flapping port
      - alert: TCPPortFlapping
        expr: changes(tcpcheck_status[10m]) > 4
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "TCP port {{ $labels.tcpcheck_endpoint }} is flapping"
          description: "Port status changed more than 4 times in 10 minutes."
```

The flapping alert is particularly useful. A port that alternates between open and closed usually indicates a service that is crashing and restarting, or a load balancer with an unhealthy backend in the pool.

## Combining TCP Checks with Application Monitoring

TCP checks are most valuable as a diagnostic layer alongside application monitoring. When your application reports database connection timeouts, a TCP check on port 5432 that is also failing confirms the problem is at the network or host level, not in the application code.

Here is a practical correlation approach using labels:

```yaml
# enrichment-processor.yaml
# Map TCP check targets to the service names used in your application
# traces and metrics, enabling easy cross-referencing in dashboards.

processors:
  transform/tcp_service:
    error_mode: ignore
    metric_statements:
      - set(datapoint.attributes["associated_service"], "postgres") where datapoint.attributes["tcpcheck.endpoint"] == "postgres-primary.internal:5432" or datapoint.attributes["tcpcheck.endpoint"] == "postgres-replica.internal:5432"
```

With consistent labeling, your dashboards can show TCP port status alongside application error rates for the same service, making root cause identification straightforward.

## Practical Considerations

Keep the total number of TCP check targets manageable. Each check creates a TCP connection, and running thousands of checks from a single collector adds non-trivial network overhead. For large environments, distribute checks across multiple collectors with each one responsible for targets in its network segment.

Also, be aware that TCP checks only verify that a connection can be established. They do not verify that the service behind the port is functioning correctly. A PostgreSQL server that accepts connections but cannot execute queries will pass a TCP check. Use TCP checks as your first layer of detection, and layer application-level health checks on top for complete coverage.
