# How to Monitor Network Interface Throughput and Error Rates with OpenTelemetry Host Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Host Metrics, Network Monitoring, Infrastructure

Description: Set up OpenTelemetry host metrics receiver to collect network interface throughput and error rate data from your servers.

Knowing how much traffic flows through your servers' network interfaces and how many errors occur at that layer is fundamental to infrastructure monitoring. Before OpenTelemetry, you might have relied on node_exporter, collectd, or vendor-specific agents. Now, the OpenTelemetry Collector's host metrics receiver can collect this data natively and feed it into your existing observability pipeline.

This post covers how to configure the host metrics receiver to capture network interface metrics, set up useful processors, and export the data to a backend for alerting and dashboards.

## What the Host Metrics Receiver Captures

The `hostmetrics` receiver in the OpenTelemetry Collector scrapes system-level metrics directly from the OS. For network interfaces, it collects:

- `system.network.io` - bytes sent and received per interface
- `system.network.packets` - packets sent and received per interface
- `system.network.errors` - error counts per interface and direction
- `system.network.dropped` - dropped packet counts per interface and direction
- `system.network.connections` - active connection counts by state (ESTABLISHED, TIME_WAIT, etc.)

Each metric comes with attributes like `device` (the interface name, e.g., `eth0`) and `direction` (`transmit` or `receive`).

## Collector Configuration

Here is a complete collector configuration that scrapes network metrics every 30 seconds and exports them via OTLP. The config includes filtering to exclude loopback and virtual interfaces that usually just add noise:

```yaml
# otel-collector-config.yaml
receivers:
  hostmetrics:
    # Scrape interval for all host metrics
    collection_interval: 30s
    scrapers:
      # Enable the network scraper
      network:
        # Only include physical interfaces, skip loopback and docker/veth
        include:
          interfaces:
            - eth0
            - eth1
            - ens5
            - eno1
          match_type: strict

processors:
  # Add metadata about the host
  resourcedetection:
    detectors: [env, system]
    system:
      hostname_sources: ["os"]

  # Compute rate-of-change from cumulative counters
  # This turns cumulative byte counts into bytes/sec
  cumulativetodelta:
    include:
      metrics:
        - system.network.io
        - system.network.packets
        - system.network.errors
        - system.network.dropped
      match_type: strict

  batch:
    timeout: 10s
    send_batch_size: 256

exporters:
  otlp:
    endpoint: "https://your-otel-backend.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resourcedetection, cumulativetodelta, batch]
      exporters: [otlp]
```

A few things worth noting in this config. The `cumulativetodelta` processor is important because the raw network metrics are cumulative counters (total bytes since boot). Converting them to deltas makes it much easier to compute rates in your backend. The `resourcedetection` processor attaches the hostname so you can group metrics by server.

## Running the Collector

You can run the collector as a systemd service or in a container. Here is a Docker Compose snippet that works well for testing:

```yaml
# docker-compose.yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
      # Required for host metrics - mount the host's /proc and /sys
      - /proc:/hostfs/proc:ro
      - /sys:/hostfs/sys:ro
    environment:
      # Tell the collector where to find host filesystem
      - HOST_PROC=/hostfs/proc
      - HOST_SYS=/hostfs/sys
    ports:
      - "4317:4317"
    pid: host
    # Network mode host gives accurate network interface readings
    network_mode: host
```

The `network_mode: host` setting is important. Without it, the collector sees the container's virtual interfaces instead of the host's physical ones.

## Querying for Throughput

Once data flows into your backend, you can build throughput queries. Here is an example using PromQL syntax (most OTLP-compatible backends support this):

```promql
# Bytes per second received on eth0 for each host
rate(system_network_io_total{direction="receive", device="eth0"}[5m])

# Convert to megabits per second for easier reading
rate(system_network_io_total{direction="receive", device="eth0"}[5m]) * 8 / 1000000

# Total error rate across all monitored interfaces
sum by (host_name) (rate(system_network_errors_total[5m]))
```

## Setting Up Alerts for Error Rates

Network errors at the interface level often signal hardware problems, cable issues, or driver bugs. Even a small error rate deserves attention. Here is an example alert rule:

```yaml
# alerting-rules.yaml
groups:
  - name: network-interface-alerts
    rules:
      # Alert if any interface sees more than 10 errors per minute
      - alert: HighNetworkErrorRate
        expr: sum by (host_name, device) (rate(system_network_errors_total[5m])) > 0.17
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High network error rate on {{ $labels.device }} at {{ $labels.host_name }}"

      # Alert if dropped packets exceed threshold
      - alert: NetworkPacketDrops
        expr: sum by (host_name, device) (rate(system_network_dropped_total[5m])) > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Packet drops detected on {{ $labels.device }} at {{ $labels.host_name }}"
```

## Excluding Noisy Interfaces

In production, you often have dozens of virtual interfaces from containers, VPNs, and bridges. Instead of listing every physical interface in the `include` block, you can use regex matching to exclude the noisy ones:

```yaml
# Alternative: exclude virtual interfaces instead of listing physical ones
scrapers:
  network:
    exclude:
      interfaces:
        - "^veth"
        - "^docker"
        - "^br-"
        - "^lo$"
      match_type: regexp
```

This approach scales better when you deploy the same collector config across servers with different interface naming conventions.

## Wrapping Up

The OpenTelemetry Collector's host metrics receiver gives you solid network interface monitoring without needing a separate agent. By combining it with the `cumulativetodelta` processor, you get rate-based metrics that are easy to alert on. Deploy this alongside your application-level telemetry and you get a complete picture of both your code's behavior and the infrastructure it runs on.
