# How to Build Grafana Dashboards for IPv4 Network Traffic Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, IPv4, Network Traffic, Dashboard, Prometheus, Visualization

Description: Build Grafana dashboards to visualize IPv4 network traffic metrics from Prometheus, including bandwidth graphs, packet rates, and per-host network utilization panels.

## Introduction

Network traffic dashboards in Grafana visualize bandwidth utilization, packet rates, and error counts per interface. Using Prometheus as the data source and Node Exporter metrics, you can build comprehensive network monitoring dashboards with minimal configuration.

## Dashboard JSON Panels

```json
{
  "panels": [
    {
      "id": 1,
      "title": "Network Bandwidth (Mbps)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(node_network_receive_bytes_total{device=~\"$device\",device!~\"lo|docker.*|veth.*\",instance=\"$instance\"}[5m]) * 8 / 1000000",
          "legendFormat": "Inbound - {{device}}",
          "refId": "A"
        },
        {
          "expr": "rate(node_network_transmit_bytes_total{device=~\"$device\",device!~\"lo|docker.*|veth.*\",instance=\"$instance\"}[5m]) * 8 / 1000000",
          "legendFormat": "Outbound - {{device}}",
          "refId": "B"
        }
      ]
    }
  ]
}
```

## PromQL Queries for Dashboard Panels

```promql
# Panel 1: Inbound bandwidth per interface (Mbps)

rate(node_network_receive_bytes_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m]) * 8 / 1000000

# Panel 2: Outbound bandwidth per interface (Mbps)
rate(node_network_transmit_bytes_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m]) * 8 / 1000000

# Panel 3: Packet receive rate (pps)
rate(node_network_receive_packets_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m])

# Panel 4: Packet drop rate
rate(node_network_receive_drop_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m]) +
rate(node_network_transmit_drop_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m])

# Panel 5: Network error rate
rate(node_network_receive_errs_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m]) +
rate(node_network_transmit_errs_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m])

# Panel 6: Top 10 hosts by bandwidth (for fleet overview)
topk(10,
  (
    sum by (instance) (
      rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*"}[5m])
    ) +
    sum by (instance) (
      rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*"}[5m])
    )
  ) * 8 / 1000000
)
```

## Dashboard Variables

```text
Variable: instance
Type: Query
Query type: Label values
Metric: node_network_receive_bytes_total
Label: instance
Refresh: On dashboard load
Multi-value: false

Variable: device
Type: Query
Query type: Label values
Metric: node_network_receive_bytes_total{instance="$instance"}
Label: device
Refresh: On dashboard load
Multi-value: true
Include all value: true
```

## Provisioning Dashboards

```yaml
# /etc/grafana/provisioning/dashboards/default.yml

apiVersion: 1

providers:
  - name: 'Network Dashboards'
    orgId: 1
    folder: 'Infrastructure'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 60
    options:
      path: /etc/grafana/dashboards
```

```bash
# Place dashboard JSON files in:
# /etc/grafana/dashboards/network-traffic.json

# Grafana will load or update them automatically based on updateIntervalSeconds.
# If you change the provisioning file itself, restart Grafana:
sudo systemctl restart grafana-server
```

## Grafana-managed Alert Rules

```text
Grafana-managed alert rule example:
Alert when inbound bandwidth exceeds 800 Mbps

Query A:
rate(node_network_receive_bytes_total{device=~"$device",device!~"lo|docker.*|veth.*",instance="$instance"}[5m]) * 8 / 1000000

Condition:
Reduce last() of query A, then Threshold is above 800

Contact point:
Route notifications to a contact point such as email, Slack, or PagerDuty
```

## Conclusion

Build Grafana network traffic dashboards using the `node_network_receive_bytes_total` and `node_network_transmit_bytes_total` metrics from Node Exporter. Use `rate()` to convert cumulative counters to per-second values and multiply by 8 and divide by 1000000 for Mbps. Create template variables for instance and device to make dashboards reusable across all hosts. Provision dashboards via YAML files in `/etc/grafana/provisioning/dashboards/` for version-controlled dashboard management.
