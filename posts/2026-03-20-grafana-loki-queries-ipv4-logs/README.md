# How to Query IPv4 Access Logs with Grafana Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Loki, IPv4, Log Queries, LogQL, Monitoring

Description: Use Grafana Loki to collect, query, and visualize IPv4 address patterns in web server access logs, build log panels in Grafana, and create alerts on log-based metrics.

## Introduction

Loki stores and queries logs using LogQL. For IPv4 monitoring, you can filter logs by client IP address, count requests per source IP, identify top talkers, and alert on suspicious access patterns-all without indexing log content.

## Loki Configuration for Log Collection

```yaml
# /etc/loki/loki-local-config.yaml

auth_enabled: false

server:
  http_listen_address: 10.0.0.25
  http_listen_port: 3100
  grpc_listen_address: 10.0.0.25

common:
  path_prefix: /var/loki
  replication_factor: 1
  ring:
    instance_addr: 10.0.0.25
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /var/loki/chunks
```

## Promtail Configuration (Legacy Log Shipper)

Promtail reached end of life on March 2, 2026. Use Grafana Alloy or another supported client for new deployments; the example below is for existing Promtail installations.

```yaml
# /etc/promtail/config.yml

server:
  http_listen_address: 10.0.0.1
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://10.0.0.25:3100/loki/api/v1/push

scrape_configs:
  - job_name: nginx_access
    static_configs:
      - targets: ['localhost']
        labels:
          job: nginx
          host: 10.0.0.1
          __path__: /var/log/nginx/access.log

  - job_name: syslog
    static_configs:
      - targets: ['localhost']
        labels:
          job: syslog
          host: 10.0.0.1
          __path__: /var/log/syslog
```

## LogQL Queries for IPv4 Analysis

```logql
# All Nginx access logs

{job="nginx"}

# Requests from specific IPv4
{job="nginx"} |= ip("203.0.113.20")

# Requests matching IPv4 subnet (CIDR)
{job="nginx"} |= ip("10.0.0.0/24")

# Count requests per source IP (metric query)
sum by (remote_addr) (
  count_over_time(
    {job="nginx"}
    | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>`
    [5m]
  )
)

# Top 10 IPs by request count
topk(10,
  sum by (remote_addr) (
    count_over_time(
      {job="nginx"}
      | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>`
      [5m]
    )
  )
)

# HTTP 4xx errors per IP
sum by (remote_addr) (
  count_over_time(
    {job="nginx"}
    | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>`
    | status =~ "4.."
    [5m]
  )
)

# Bandwidth per IP (if log includes bytes)
sum by (remote_addr) (
  sum_over_time(
    {job="nginx"}
    | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>`
    | unwrap bytes_sent [5m]
  )
)
```

## Grafana Panel Configuration

```bash
# In Grafana, create a new panel with Loki data source:

# Panel 1: Log stream (Logs type)
# Query: {job="nginx"} | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>` | remote_addr != ""

# Panel 2: Request rate by IP (Time series type)
# Query: sum by (remote_addr) (rate({job="nginx"} | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>` [5m]))

# Panel 3: Top IPs table (Table type)
# Query: topk(10, sum by (remote_addr) (count_over_time({job="nginx"} | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>` [1h])))

# Panel 4: Error rate (Stat type)
# Query: sum(rate({job="nginx"} | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>` | status =~ "5.." [5m]))
```

## Loki Alert Rules

```yaml
# /etc/loki/rules/nginx_alerts.yml

groups:
  - name: nginx_logs
    rules:
      - alert: HighErrorRate
        expr: >
          sum(rate({job="nginx"} | pattern `<remote_addr> - - <_> "<method> <uri> <_>" <status> <bytes_sent> <_> "<agent>" <_>` | status =~ "[45].." [5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High HTTP error rate in nginx logs"
```

## Conclusion

Loki with LogQL enables IPv4-based log analysis without indexing full log content. Use `ip()` for exact IP, range, and CIDR matches, and `| pattern` or `| regexp` when you need to extract fields from Nginx access logs at query time. Combine with Prometheus metrics for mixed log+metric dashboards. Alert on log-derived metrics using Loki ruler configuration for detecting high error rates or suspicious access patterns.
