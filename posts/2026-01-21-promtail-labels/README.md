# How to Add Labels to Logs in Promtail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, Labels, Log Indexing, Metadata, Query Performance

Description: A comprehensive guide to adding and managing labels in Promtail for Grafana Loki, covering static labels, dynamic labeling, label best practices, and cardinality management.

---

Labels in Loki are the primary mechanism for indexing and querying logs. Proper labeling strategy is crucial for query performance and storage efficiency. This guide covers how to effectively add and manage labels in Promtail.

## Prerequisites

Before starting, ensure you have:

- Promtail installed and configured
- Understanding of Loki's label-based indexing
- Access to modify Promtail configuration
- Knowledge of your log structure

## Understanding Labels in Loki

### How Labels Work

```
{job="nginx", env="production", host="server01"} Log line content here
```

- Labels form the log stream identifier
- Same labels = same stream
- Different labels = different streams
- Labels are indexed, log content is not

### Label Cardinality

| Cardinality | Example | Impact |
|-------------|---------|--------|
| Low | `env=production` | Good - few unique values |
| Medium | `host=server01` | OK - moderate unique values |
| High | `request_id=abc123` | Bad - many unique values |

## Static Labels

### Basic Static Labels

```yaml
scrape_configs:
  - job_name: app
    static_configs:
      - targets: [localhost]
        labels:
          job: my-application
          env: production
          datacenter: us-east-1
          team: backend
          __path__: /var/log/app/*.log
```

### Multiple Paths with Different Labels

```yaml
scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          type: application
          __path__: /var/log/app/app.log

      - targets: [localhost]
        labels:
          job: app
          type: access
          __path__: /var/log/app/access.log

      - targets: [localhost]
        labels:
          job: app
          type: error
          __path__: /var/log/app/error.log
```

## Dynamic Labels from Path

### Extracting from File Path

```yaml
scrape_configs:
  - job_name: apps
    static_configs:
      - targets: [localhost]
        labels:
          __path__: /var/log/*/*.log
    relabel_configs:
      - source_labels: [__path__]
        regex: '/var/log/(.*)/.*.log'
        target_label: app
```

### Multiple Path Components

```yaml
# Path: /var/log/production/order-service/app.log
relabel_configs:
  - source_labels: [__path__]
    regex: '/var/log/([^/]+)/([^/]+)/.*'
    target_label: env
    replacement: '$1'

  - source_labels: [__path__]
    regex: '/var/log/([^/]+)/([^/]+)/.*'
    target_label: service
    replacement: '$2'
```

### Filename as Label

```yaml
relabel_configs:
  - source_labels: [__path__]
    regex: '.*/([^/]+)\\.log'
    target_label: filename
```

## Dynamic Labels from Log Content

### JSON Labels

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        service: service
        version: version
  - labels:
      level:
      service:
      version:
```

### Logfmt Labels

```yaml
pipeline_stages:
  - logfmt:
      mapping:
        level:
        app:
        component:
  - labels:
      level:
      app:
      component:
```

### Regex Labels

```yaml
pipeline_stages:
  - regex:
      expression: '(?P<level>\w+)\s+\[(?P<thread>[^\]]+)\]\s+(?P<class>\S+)'
  - labels:
      level:
      # Note: thread and class might be too high cardinality
```

## Kubernetes Labels

### Pod Labels

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Namespace as label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

      # Pod name
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

      # Container name
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container

      # App label from pod
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app

      # Custom labels from annotations
      - source_labels: [__meta_kubernetes_pod_annotation_logging_team]
        target_label: team
```

### Node Labels

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_node_name]
    target_label: node

  - source_labels: [__meta_kubernetes_node_label_topology_kubernetes_io_zone]
    target_label: zone
```

### Deployment Labels

```yaml
relabel_configs:
  # Extract deployment name from pod name
  - source_labels: [__meta_kubernetes_pod_name]
    regex: '(.+)-[a-z0-9]+-[a-z0-9]+'
    target_label: deployment
```

## Label Transformation

### Label Mapping

```yaml
pipeline_stages:
  - json:
      expressions:
        loglevel: level
  - labelmap:
      source: loglevel
      mapping:
        ERROR: error
        WARN: warning
        INFO: info
        DEBUG: debug
  - labels:
      level: loglevel
```

### Label Drop

```yaml
pipeline_stages:
  - labeldrop:
      - __meta_kubernetes_pod_label_pod_template_hash
      - __meta_kubernetes_pod_label_controller_revision_hash
```

### Label Keep

```yaml
pipeline_stages:
  - labelkeep:
      - job
      - namespace
      - pod
      - container
```

### Label Allow

```yaml
# Only allow specific labels
pipeline_stages:
  - labelallow:
      - job
      - env
      - service
      - level
```

## Relabeling

### Basic Relabel

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace

  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
```

### Regex Replacement

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    regex: '(.+)-service'
    replacement: '$1'
    target_label: app
```

### Multiple Source Labels

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_pod_name]
    separator: '/'
    target_label: namespace_pod
```

### Conditional Labeling

```yaml
relabel_configs:
  # Add label only if annotation exists
  - source_labels: [__meta_kubernetes_pod_annotation_sla_tier]
    regex: '.+'
    target_label: sla_tier
```

## Best Practices

### Low Cardinality Labels

```yaml
# Good - limited unique values
labels:
  env: production          # ~3-5 values
  region: us-east          # ~5-10 values
  service: order-service   # ~50-100 values
  level: error            # ~5 values

# Bad - high cardinality
labels:
  request_id: abc123      # Millions of values
  user_id: user-456       # Thousands of values
  timestamp: 1234567890   # Unlimited values
```

### Useful vs Expensive Labels

```yaml
# Useful for filtering
labels:
  job: nginx
  namespace: production
  app: api-gateway
  level: error

# Expensive but sometimes necessary
labels:
  host: server01  # OK if limited servers
  pod: api-abc123 # High cardinality, use carefully
```

### Label Naming Conventions

```yaml
# Good naming
labels:
  app_name: order-service
  environment: production
  log_level: error

# Avoid
labels:
  APP_NAME: order-service  # Inconsistent casing
  env: prod                # Abbreviated
  lvl: err                 # Too short
```

## Cardinality Management

### Monitor Cardinality

```promql
# Stream count
count(count by (__name__) ({job="app"}))

# Streams by label
sum by (label_name) (
  count_over_time({job="app"}[1h])
)
```

### Limit High Cardinality

```yaml
# Instead of label, keep in log content
pipeline_stages:
  - json:
      expressions:
        request_id: request_id
        user_id: user_id
  # Don't add these as labels!
  # - labels:
  #     request_id:
  #     user_id:
```

### Alert on High Cardinality

```yaml
groups:
  - name: loki-cardinality
    rules:
      - alert: HighLabelCardinality
        expr: |
          count by (job) (count_over_time({job=~".+"}[1h])) > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High stream count for {{ $labels.job }}"
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
      # Keep only specific namespaces
      - source_labels: [__meta_kubernetes_namespace]
        regex: '(production|staging)'
        action: keep

      # Standard labels
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container

      # App from pod label
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app

      # Team from annotation
      - source_labels: [__meta_kubernetes_pod_annotation_team]
        target_label: team

      # Extract service from pod name
      - source_labels: [__meta_kubernetes_pod_name]
        regex: '(.+)-[a-z0-9]+-[a-z0-9]+'
        target_label: service

      # Set job label
      - replacement: kubernetes-pods
        target_label: job

      # Drop high-cardinality internal labels
      - regex: __meta_kubernetes_pod_label_pod_template_hash
        action: labeldrop

    pipeline_stages:
      # Parse JSON logs
      - json:
          expressions:
            level: level
            component: component

      # Add level as label
      - labels:
          level:

      # Normalize level values
      - match:
          selector: '{level=~"ERROR|error"}'
          stages:
            - labeldrop:
                - level
            - labels:
                level: error

      # Keep only allowed labels
      - labelallow:
          - job
          - namespace
          - container
          - app
          - service
          - team
          - level
```

## Troubleshooting

### Check Active Labels

```bash
# Via Loki API
curl http://loki:3100/loki/api/v1/labels

# Label values
curl http://loki:3100/loki/api/v1/label/job/values
```

### Debug Relabeling

```yaml
# Add temporary logging
relabel_configs:
  - source_labels: [__address__]
    target_label: __tmp_debug
    # Check Promtail logs for debug info
```

### Verify Label Application

```logql
# Check if labels are applied
{job="app"} | label_format all_labels="{{__name__}}"
```

## Conclusion

Effective labeling is crucial for Loki performance and usability. Key takeaways:

- Use low-cardinality labels for indexing
- Keep high-cardinality data in log content
- Use consistent naming conventions
- Monitor label cardinality
- Use relabeling for Kubernetes metadata
- Drop unnecessary labels

With proper labeling, you can build efficient and queryable log pipelines in Loki.
