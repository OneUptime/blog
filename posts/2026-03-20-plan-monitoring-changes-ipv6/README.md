# How to Plan Monitoring Changes for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Monitoring, Prometheus, Grafana, Observability, Migration

Description: Update monitoring infrastructure to handle IPv6 scrape targets, alert rules that fire on IPv6 addresses, and dashboards that visualize IPv6 and IPv4 traffic separately.

## Introduction

Monitoring changes for IPv6 migration are often overlooked, leading to gaps in observability during and after the transition. Key changes include configuring Prometheus to scrape IPv6 targets, updating alert rules to match IPv6 address patterns, and creating Grafana dashboards that show IPv6 traffic alongside IPv4.

## Step 1: Prometheus IPv6 Target Scraping

```yaml
# prometheus.yml - add IPv6 scrape targets

global:
  scrape_interval: 15s

scrape_configs:
  # Existing IPv4 targets
  - job_name: 'node-exporter-ipv4'
    static_configs:
      - targets: ['10.0.0.1:9100', '10.0.0.2:9100']

  # New IPv6 targets - bracket notation
  - job_name: 'node-exporter-ipv6'
    static_configs:
      - targets:
          - '[2001:db8::10]:9100'
          - '[2001:db8::11]:9100'
        labels:
          ip_version: 'ipv6'
          dc: 'us-east-1'

  # Kubernetes service discovery with explicit IPv4/IPv6 address formatting
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # If you rewrite __address__ from __meta_kubernetes_pod_ip,
      # handle IPv6 and IPv4 separately.
      - source_labels: [__meta_kubernetes_pod_ip]
        regex: '(.+:.*)'
        target_label: __address__
        replacement: '[${1}]:8080'  # Bracket notation for IPv6 compatibility
      - source_labels: [__meta_kubernetes_pod_ip]
        regex: '([0-9.]+)'
        target_label: __address__
        replacement: '${1}:8080'
```

## Step 2: Verify Prometheus Scrapes IPv6 Targets

```bash
# Check Prometheus targets API

curl -6 "http://[::1]:9090/api/v1/targets" | python3 -m json.tool | grep -A5 ipv6

# Query metric from IPv6 target
curl -6 -G "http://[::1]:9090/api/v1/query" \
    --data-urlencode "query=up{ip_version='ipv6'}"

# Run Prometheus with IPv6 listening
prometheus \
    --config.file=prometheus.yml \
    --web.listen-address="[::]:9090"
```

## Step 3: Update Alert Rules for IPv6

```yaml
# /etc/prometheus/rules/ipv6-alerts.yml

groups:
  - name: ipv6_alerts
    rules:
      # Alert on IPv6 service down (not IPv4)
      - alert: IPv6ServiceDown
        expr: up{ip_version="ipv6"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 service {{ $labels.job }} is down"
          description: "Target {{ $labels.instance }} (IPv6) has been down for 2 minutes"

      # Alert on IPv6 traffic drop (may indicate routing issue)
      - alert: IPv6TrafficDrop
        expr: |
          (
            sum(rate(http_requests_total{ip_version="ipv6"}[5m])) == 0
          ) and (
            sum(rate(http_requests_total{ip_version="ipv4"}[5m])) > 0
          )
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 traffic dropped to zero"
          description: "IPv6 traffic dropped to zero while IPv4 traffic is flowing - possible dual-stack routing issue"

      # Alert on high IPv6 error rate
      - alert: HighIPv6ErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5..",ip_version="ipv6"}[5m]))
          /
          sum(rate(http_requests_total{ip_version="ipv6"}[5m]))
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 error rate > 5%"
```

## Step 4: Update Grafana Dashboards

Add an IPv6 traffic panel to existing dashboards:

```json
{
  "title": "HTTP Requests by IP Version",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum(rate(http_requests_total{ip_version='ipv6'}[5m]))",
      "legendFormat": "IPv6"
    },
    {
      "expr": "sum(rate(http_requests_total{ip_version='ipv4'}[5m]))",
      "legendFormat": "IPv4"
    }
  ]
}
```

```promql
# Useful PromQL queries for IPv6 monitoring dashboards

# IPv6 traffic percentage
sum(rate(http_requests_total{ip_version="ipv6"}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100

# Top IPv6 source IPs by request rate
topk(10, sum by (client_ip) (
  rate(http_requests_total{ip_version="ipv6"}[5m])
))

# IPv6 target availability
count(up{ip_version="ipv6"} == 1) / count(up{ip_version="ipv6"})
```

## Step 5: Monitoring Checklist

| Component | Change Required |
|-----------|----------------|
| Prometheus | Add IPv6 targets; enable IPv6 web listening if needed |
| Alertmanager | Enable IPv6 listening if needed; update receiver URLs if they use literal IPv6 addresses |
| Grafana | Add IPv6 panels; update `http_addr` / `http_port` if Grafana must be reachable over IPv6 |
| Blackbox exporter | Add IPv6 HTTP/TCP probes |
| node_exporter | Enable IPv6 listening if you scrape it over IPv6 |
| Log aggregation | Update filters for IPv6 patterns |
| SNMP monitoring | Enable IPv6 for device polling |
| Uptime monitors | Add AAAA record checks |

## Step 6: Uptime Monitoring for IPv6

```yaml
# Blackbox exporter config for IPv6 probes
# /etc/prometheus/blackbox.yml

modules:
  http_ipv6:
    prober: http
    timeout: 10s
    http:
      preferred_ip_protocol: ip6   # Force IPv6
      ip_protocol_fallback: false  # Don't fall back to IPv4

  tcp_ipv6:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: ip6
```

```yaml
# Prometheus scrape config for blackbox probes
- job_name: 'ipv6-http-checks'
  metrics_path: /probe
  params:
    module: [http_ipv6]
  static_configs:
    - targets:
        - https://www.example.com
        - https://api.example.com
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - source_labels: [__param_target]
      target_label: instance
    - target_label: __address__
      replacement: '[::1]:9115'  # Blackbox exporter
```

## Conclusion

Monitoring IPv6 requires changes at every observability layer. Prometheus supports IPv6 scrape targets with bracket notation in the target address. Enable IPv6 listeners on the monitoring components that need to be reachable over IPv6, and configure separate IPv4 and IPv6 listeners when your runtime does not provide dual-stack sockets by default. Add `ip_version` labels to metrics during collection, then use them in alert rules and dashboards to distinguish IPv6 and IPv4 traffic. A key alert to create immediately is "IPv6 traffic dropped to zero while IPv4 is flowing" - this catches dual-stack routing failures that affect IPv6 users but appear normal from IPv4-only monitoring.
