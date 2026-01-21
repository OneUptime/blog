# How to Drop and Filter Logs in Promtail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, Log Filtering, Drop Logs, Cost Reduction, Log Volume

Description: A comprehensive guide to dropping and filtering logs in Promtail to reduce log volume, lower costs, and improve Loki performance by eliminating unnecessary log data before ingestion.

---

Not all logs are equally valuable. Health checks, debug logs, and redundant messages can consume significant storage without providing actionable insights. This guide covers techniques for dropping and filtering logs in Promtail to reduce volume and costs.

## Prerequisites

Before starting, ensure you have:

- Promtail installed and configured
- Understanding of your log patterns
- Access to Promtail configuration
- Metrics to measure log volume

## Why Filter Logs

### Cost Reduction

- Reduce storage costs in object storage
- Lower ingestion costs
- Decrease network bandwidth

### Performance Improvement

- Faster queries with less data
- Reduced Loki resource usage
- Better query response times

### Signal vs Noise

- Focus on actionable logs
- Remove redundant information
- Improve log quality

## Drop Stage

### Basic Drop

```yaml
pipeline_stages:
  - drop:
      expression: '.*healthcheck.*'
```

### Drop by Pattern

```yaml
pipeline_stages:
  # Drop health check endpoints
  - drop:
      expression: 'GET /health'

  # Drop readiness probes
  - drop:
      expression: 'GET /ready'

  # Drop metrics endpoints
  - drop:
      expression: 'GET /metrics'
```

### Drop by Log Level

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
  - labels:
      level:
  - drop:
      source: level
      expression: '(DEBUG|TRACE)'
```

### Drop Older Logs

```yaml
pipeline_stages:
  - drop:
      older_than: 24h
      drop_counter_reason: 'too_old'
```

### Drop with Rate

```yaml
pipeline_stages:
  # Sample 10% of info logs
  - drop:
      expression: '.*INFO.*'
      drop_counter_reason: 'info_sampling'
      value: '0.9'  # Drop 90%
```

## Match Stage for Filtering

### Conditional Drop

```yaml
pipeline_stages:
  - match:
      selector: '{job="nginx"}'
      stages:
        - drop:
            expression: '.*kube-probe.*'
```

### Drop by Label

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
  - labels:
      level:
  - match:
      selector: '{level="debug"}'
      action: drop
```

### Complex Conditions

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        path: path
  - labels:
      level:
  - match:
      selector: '{level="info"}'
      stages:
        - drop:
            expression: '.*(health|ready|alive).*'
```

## Relabeling for Filtering

### Drop at Discovery

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Drop pods with annotation
      - source_labels: [__meta_kubernetes_pod_annotation_promtail_ignore]
        regex: 'true'
        action: drop

      # Keep only specific namespaces
      - source_labels: [__meta_kubernetes_namespace]
        regex: '(production|staging)'
        action: keep

      # Drop system namespaces
      - source_labels: [__meta_kubernetes_namespace]
        regex: 'kube-system'
        action: drop
```

### Drop by Container Name

```yaml
relabel_configs:
  # Drop sidecar containers
  - source_labels: [__meta_kubernetes_pod_container_name]
    regex: '(istio-proxy|envoy|linkerd-proxy)'
    action: drop
```

## Common Filtering Patterns

### Health Check Filtering

```yaml
pipeline_stages:
  - drop:
      expression: |
        .*(
          /health|
          /healthz|
          /healthcheck|
          /ready|
          /readiness|
          /live|
          /liveness|
          /ping|
          /status
        ).*
```

### Load Balancer Filtering

```yaml
pipeline_stages:
  # AWS ALB health checks
  - drop:
      expression: 'ELB-HealthChecker'

  # HAProxy health checks
  - drop:
      expression: 'HAProxy'

  # Kubernetes probes
  - drop:
      expression: 'kube-probe'
```

### Debug Log Filtering

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
  - match:
      selector: '{}'
      stages:
        - drop:
            source: level
            expression: '(DEBUG|TRACE|debug|trace)'
```

### Noisy Service Filtering

```yaml
pipeline_stages:
  # Drop verbose library logs
  - drop:
      expression: 'org\.apache\.http\.wire'

  # Drop SQL query logs in production
  - drop:
      expression: 'Executing SQL:'

  # Drop connection pool logs
  - drop:
      expression: 'HikariPool.*connection'
```

### Bot and Crawler Filtering

```yaml
pipeline_stages:
  - drop:
      expression: |
        .*(
          Googlebot|
          bingbot|
          Baiduspider|
          YandexBot|
          Sogou|
          facebookexternalhit|
          Twitterbot|
          LinkedInBot|
          Slackbot
        ).*
```

### Static Asset Filtering

```yaml
pipeline_stages:
  - regex:
      expression: '"GET (?P<path>\S+)'
  - drop:
      source: path
      expression: '\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$'
```

## Sampling Strategies

### Rate-Based Sampling

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
  - labels:
      level:

  # Sample 50% of info logs
  - match:
      selector: '{level="info"}'
      stages:
        - drop:
            value: '0.5'
            drop_counter_reason: 'info_sampling'
```

### Conditional Sampling

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        path: path
  - labels:
      level:

  # Sample frequent endpoints
  - match:
      selector: '{level="info"}'
      stages:
        - regex:
            source: path
            expression: '/(api/events|metrics)'
        - drop:
            value: '0.9'  # Keep 10%
```

### Time-Based Sampling

```yaml
pipeline_stages:
  # During business hours, keep all logs
  # After hours, sample more aggressively
  # (Use external config management)
```

## Kubernetes-Specific Filtering

### Filter by Namespace

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - production
            - staging
    # Excludes all other namespaces
```

### Filter System Pods

```yaml
relabel_configs:
  # Drop kube-system logs
  - source_labels: [__meta_kubernetes_namespace]
    regex: kube-system
    action: drop

  # Drop monitoring stack logs
  - source_labels: [__meta_kubernetes_namespace]
    regex: monitoring
    action: drop
```

### Filter by Pod Annotation

```yaml
relabel_configs:
  # Drop pods with logging disabled
  - source_labels: [__meta_kubernetes_pod_annotation_logging_enabled]
    regex: 'false'
    action: drop

  # Only keep pods with logging explicitly enabled
  - source_labels: [__meta_kubernetes_pod_annotation_logging_enabled]
    regex: 'true'
    action: keep
```

### Filter Init Containers

```yaml
relabel_configs:
  # Drop init container logs
  - source_labels: [__meta_kubernetes_pod_container_init]
    regex: 'true'
    action: drop
```

## Measuring Filter Effectiveness

### Promtail Metrics

```promql
# Dropped entries by reason
sum by (reason) (rate(promtail_dropped_entries_total[5m]))

# Drop rate percentage
rate(promtail_dropped_entries_total[5m])
/
rate(promtail_read_entries_total[5m])
* 100
```

### Before/After Comparison

```promql
# Ingestion rate
sum(rate(loki_distributor_bytes_received_total[5m]))

# Entry rate
sum(rate(loki_distributor_lines_received_total[5m]))
```

### Dashboard Panel

```yaml
# Grafana panel for drop rate monitoring
{
  "title": "Log Drop Rate by Reason",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum by (reason) (rate(promtail_dropped_entries_total[5m]))",
      "legendFormat": "{{ reason }}"
    }
  ]
}
```

## Complete Configuration Example

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Only production and staging
      - source_labels: [__meta_kubernetes_namespace]
        regex: '(production|staging)'
        action: keep

      # Drop system containers
      - source_labels: [__meta_kubernetes_pod_container_name]
        regex: '(istio-proxy|envoy)'
        action: drop

      # Drop if annotation says so
      - source_labels: [__meta_kubernetes_pod_annotation_promtail_io_scrape]
        regex: 'false'
        action: drop

    pipeline_stages:
      # Parse JSON if possible
      - json:
          expressions:
            level: level
            message: message
      - labels:
          level:

      # Drop debug logs
      - match:
          selector: '{level=~"debug|trace"}'
          action: drop

      # Drop health checks
      - drop:
          expression: '.*(healthz|readyz|livez|health|ready|alive).*'
          drop_counter_reason: 'health_check'

      # Drop Kubernetes probes
      - drop:
          expression: '.*kube-probe.*'
          drop_counter_reason: 'k8s_probe'

      # Drop static assets
      - drop:
          expression: '\.(css|js|png|jpg|ico|woff)'
          drop_counter_reason: 'static_asset'

      # Sample frequent paths
      - match:
          selector: '{level="info"}'
          stages:
            - drop:
                expression: '/api/events'
                value: '0.9'
                drop_counter_reason: 'events_sampling'

      # Drop old logs
      - drop:
          older_than: 1h
          drop_counter_reason: 'too_old'

      # Set output
      - output:
          source: message
```

## Best Practices

### Do's

1. Start conservative - drop obvious noise first
2. Monitor drop rates with metrics
3. Document filter rules
4. Test filters in staging
5. Review filters periodically

### Don'ts

1. Don't drop error logs
2. Don't filter without metrics
3. Don't over-sample critical paths
4. Don't filter audit logs

### Prioritize Filtering

1. Health checks (always drop)
2. Debug/trace logs (usually drop in prod)
3. Static assets (usually drop)
4. Frequent endpoints (sample)
5. Verbose libraries (drop or sample)

## Conclusion

Effective log filtering in Promtail significantly reduces costs and improves performance. Key takeaways:

- Drop health checks and probes early
- Filter debug logs in production
- Use sampling for high-volume endpoints
- Monitor drop rates with metrics
- Test filters thoroughly before deployment
- Review and adjust filters regularly

With proper filtering, you can reduce log volume by 50-90% while retaining all valuable observability data.
