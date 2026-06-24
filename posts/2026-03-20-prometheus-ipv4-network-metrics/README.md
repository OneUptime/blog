# How to Monitor IPv4 Network Metrics with Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv4, Network Metrics, Node Exporter, Monitoring, PromQL

Description: Collect and query IPv4 network interface metrics using Prometheus Node Exporter, write PromQL queries for bandwidth and packet rates, and alert on network anomalies.

## Introduction

Prometheus Node Exporter exposes detailed network metrics for each interface: bytes in/out, packets, errors, and drops. These counters reflect network interface statistics rather than IPv4-specific telemetry, and enable monitoring of bandwidth utilization, packet drops, and interface errors.

## Key Network Metrics

| Metric | Description |
|---|---|
| `node_network_receive_bytes_total` | Total bytes received per interface |
| `node_network_transmit_bytes_total` | Total bytes transmitted per interface |
| `node_network_receive_packets_total` | Total packets received |
| `node_network_transmit_packets_total` | Total packets transmitted |
| `node_network_receive_errs_total` | Total receive errors |
| `node_network_transmit_errs_total` | Total transmit errors |
| `node_network_receive_drop_total` | Total received packets dropped |
| `node_network_transmit_drop_total` | Total transmitted packets dropped |

## PromQL Queries for Network Metrics

```promql
# Incoming bandwidth in Mbps (per interface)

rate(node_network_receive_bytes_total[5m]) * 8 / 1000000

# Outgoing bandwidth in Mbps
rate(node_network_transmit_bytes_total[5m]) * 8 / 1000000

# Total bandwidth (in + out) for eth0:
(rate(node_network_receive_bytes_total{device="eth0"}[5m]) +
 rate(node_network_transmit_bytes_total{device="eth0"}[5m])) * 8 / 1000000

# Packet receive rate (packets per second)
rate(node_network_receive_packets_total{device="eth0"}[5m])

# Receive error rate (errors per second)
rate(node_network_receive_errs_total[5m])

# Receive drop rate
rate(node_network_receive_drop_total[5m])

# Top 5 interfaces by incoming bandwidth
topk(5, rate(node_network_receive_bytes_total[5m]) * 8 / 1000000)

# Inbound bandwidth per host/instance
sum by (instance) (rate(node_network_receive_bytes_total[5m])) * 8 / 1000000
```

## Recording Rules for Efficiency

```yaml
# /etc/prometheus/rules/network.yml

groups:
  - name: network_recording_rules
    rules:
      # Pre-calculate bandwidth to avoid repeated computation
      - record: instance:network_receive_bandwidth_mbps
        expr: >
          sum by (instance, device) (
            rate(node_network_receive_bytes_total[5m])
          ) * 8 / 1000000

      - record: instance:network_transmit_bandwidth_mbps
        expr: >
          sum by (instance, device) (
            rate(node_network_transmit_bytes_total[5m])
          ) * 8 / 1000000
```

## Alerting Rules

```yaml
# /etc/prometheus/rules/network_alerts.yml

groups:
  - name: network_alerts
    rules:
      # High bandwidth utilization (>900 Mbps on 1G link)
      - alert: HighNetworkBandwidth
        expr: >
          rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8 / 1000000 > 900
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High inbound bandwidth on {{ $labels.instance }} ({{ $labels.device }})"
          description: "Bandwidth: {{ $value | humanize }}Mbps"

      # Packet drops increasing
      - alert: NetworkPacketDrops
        expr: rate(node_network_receive_drop_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Packet drops on {{ $labels.instance }}"
```

## Filtering for Specific Interfaces

```promql
# Common Linux Ethernet interface naming patterns
rate(node_network_receive_bytes_total{device=~"eth[0-9]+|eno[0-9]+|ens[0-9]+|enp[0-9]+s[0-9]+(f[0-9]+)?|enx[0-9a-f]+"}[5m])

# Exclude loopback and common container/bridge interfaces
rate(node_network_receive_bytes_total{device!~"lo|docker.*|br-.*|veth.*"}[5m])
```

## Conclusion

Node Exporter provides per-interface network metrics for all system interfaces. Use `rate()` to convert cumulative counters to per-second rates, and multiply by 8 to convert bytes to bits. Set up recording rules for frequently-queried bandwidth metrics. Create alerts for high bandwidth utilization and packet drop increases to proactively detect network saturation or hardware issues.
