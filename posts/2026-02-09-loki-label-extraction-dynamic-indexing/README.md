# How to Use Loki Label Extraction from Log Lines for Dynamic Kubernetes Log Indexing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Loki, Kubernetes, Logging

Description: Discover how to extract labels dynamically from log content in Loki to create flexible indexes for Kubernetes logs without predefined label schemas.

---

Loki's label-based indexing is powerful, but static labels assigned during log collection can be limiting. When your log content contains valuable metadata that you want to query by, extracting labels dynamically from log lines opens up new possibilities for log analysis and filtering.

This guide demonstrates how to use Loki's label extraction features to create dynamic indexes based on log content, enabling more flexible queries without modifying your log collection pipeline.

## Understanding Loki's Label Architecture

Loki uses labels as its primary indexing mechanism. Unlike traditional log systems that index the entire log content, Loki only indexes labels and stores logs as compressed chunks. This design makes Loki extremely efficient but requires thoughtful label design.

Labels in Loki come from two sources:

1. **Static labels**: Added by log collectors (Promtail, Fluent Bit) based on metadata like pod name, namespace, and container name
2. **Dynamic labels**: Extracted from log content using parsers and label extraction expressions

Dynamic label extraction allows you to index fields within your logs without redeploying your log collection agents.

## Label Extraction in LogQL

LogQL provides several parser stages that extract labels from log content:

- `json`: Parse JSON logs and extract fields as labels
- `logfmt`: Parse logfmt-style logs
- `regexp`: Extract labels using regular expressions
- `pattern`: Extract labels using pattern matching

Here's a basic example of label extraction:

```logql
{namespace="production"}
  | json
  | level="error"
```

This query parses JSON logs, extracts the `level` field as a label, and filters for errors.

## Configuring Promtail for Label Extraction

While you can extract labels in queries, configuring Promtail to extract labels during collection creates persistent indexes. This approach improves query performance for frequently accessed fields.

Create a Promtail configuration that extracts labels from JSON logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: logging
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki:3100/loki/api/v1/push

    scrape_configs:
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod

        relabel_configs:
          # Standard Kubernetes labels
          - source_labels: [__meta_kubernetes_pod_node_name]
            target_label: node
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
          - source_labels: [__meta_kubernetes_pod_container_name]
            target_label: container

        pipeline_stages:
          # Parse JSON logs
          - json:
              expressions:
                level: level
                service: service
                trace_id: trace_id
                user_id: user_id
                request_method: request.method
                request_path: request.path
                status_code: response.status

          # Extract specific fields as labels
          - labels:
              level:
              service:
              trace_id:

          # Extract request method and status code conditionally
          - match:
              selector: '{service="api"}'
              stages:
                - labels:
                    request_method:
                    status_code:

          # Drop high-cardinality labels if needed
          - labeldrop:
              - trace_id
```

This configuration extracts `level`, `service`, and conditionally adds `request_method` and `status_code` for API logs.

## Dynamic Label Extraction with Pattern Matching

For non-structured logs, use pattern matching to extract labels:

```yaml
pipeline_stages:
  # Extract labels from NGINX access logs
  - regex:
      expression: '^(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<timestamp>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<bytes>\d+)'

  - labels:
      method:
      status:

  # Categorize status codes
  - template:
      source: status_category
      template: '{{ if ge .status "500" }}5xx{{ else if ge .status "400" }}4xx{{ else if ge .status "300" }}3xx{{ else }}2xx{{ end }}'

  - labels:
      status_category:
```

This extracts HTTP method and status code from NGINX logs and creates a categorized status label.

## Extracting Labels from Structured Logs

For applications that output structured logs, JSON extraction is the most efficient method:

```yaml
pipeline_stages:
  - json:
      expressions:
        app: app_name
        env: environment
        level: log_level
        request_id: context.request_id
        user_type: user.type
        error_code: error.code
        duration_ms: metrics.duration

  - labels:
      app:
      env:
      level:
      user_type:

  # Only add error_code label when present
  - match:
      selector: '{level="error"}'
      stages:
        - labels:
            error_code:

  # Convert duration to label ranges
  - template:
      source: latency_bucket
      template: '{{ if gt .duration_ms 1000.0 }}slow{{ else if gt .duration_ms 200.0 }}medium{{ else }}fast{{ end }}'

  - labels:
      latency_bucket:
```

## Managing Label Cardinality

High-cardinality labels (labels with many unique values) degrade Loki performance. Follow these best practices:

**Avoid these as labels:**
- User IDs
- Request IDs
- Trace IDs
- Timestamps
- IP addresses
- URLs with parameters

**Good label candidates:**
- Log level (error, warn, info, debug)
- Service name
- Environment (production, staging, dev)
- HTTP method (GET, POST, PUT, DELETE)
- Status code ranges (2xx, 4xx, 5xx)
- Error categories

Use `labeldrop` to remove high-cardinality labels after parsing:

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        trace_id: trace_id  # Parse but don't keep as label
        user_id: user_id    # Parse but don't keep as label

  - labels:
      level:

  # Keep trace_id in log line but not as label
  - output:
      source: message
```

## Query-Time Label Extraction

For occasional queries that need specific labels, extract them at query time instead of indexing:

```logql
# Extract user_id from JSON logs for specific investigation
{namespace="production", app="api"}
  | json
  | user_id="12345"
  | level="error"
```

This approach avoids the indexing overhead of high-cardinality labels while still allowing targeted queries.

## Building Label Templates

Create derived labels from multiple fields:

```yaml
pipeline_stages:
  - json:
      expressions:
        http_status: response.status
        error_type: error.type

  # Create composite label for error classification
  - template:
      source: error_class
      template: '{{ .error_type }}_{{ .http_status }}'

  - match:
      selector: '{level="error"}'
      stages:
        - labels:
            error_class:
```

## Kubernetes-Specific Label Extraction

Extract Kubernetes metadata from log content:

```yaml
pipeline_stages:
  # Extract pod metadata embedded in logs
  - json:
      expressions:
        k8s_pod: kubernetes.pod_name
        k8s_namespace: kubernetes.namespace
        k8s_container: kubernetes.container_name
        deployment: kubernetes.deployment

  - labels:
      deployment:

  # Only add namespace if not already present from Promtail
  - match:
      selector: '{namespace=""}'
      stages:
        - labels:
            k8s_namespace: namespace
```

## Testing Label Extraction

Deploy a test application that outputs structured logs:

```javascript
// test-logger.js
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

function generateTestLogs() {
  const levels = ['info', 'warn', 'error'];
  const services = ['api', 'worker', 'scheduler'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const statuses = [200, 201, 400, 404, 500, 503];

  setInterval(() => {
    logger.log({
      level: levels[Math.floor(Math.random() * levels.length)],
      message: 'Request processed',
      service: services[Math.floor(Math.random() * services.length)],
      request: {
        method: methods[Math.floor(Math.random() * methods.length)],
        path: '/api/v1/resource'
      },
      response: {
        status: statuses[Math.floor(Math.random() * statuses.length)]
      },
      duration_ms: Math.random() * 2000
    });
  }, 1000);
}

generateTestLogs();
```

Query the extracted labels:

```logql
# Count errors by service
sum by (service) (
  count_over_time({namespace="default", level="error"}[5m])
)

# View distribution of status codes
sum by (status_code) (
  count_over_time({namespace="default", service="api"}[1h])
)
```

## Monitoring Label Cardinality

Query Loki to check label cardinality:

```logql
# Check unique values for each label
{namespace="production"} | json | stats count() by level
{namespace="production"} | json | stats count() by service
```

Use Loki's series API to monitor cardinality:

```bash
# Get label cardinality metrics
curl -G http://loki:3100/loki/api/v1/label/service/values

# Check total series count
curl http://loki:3100/metrics | grep loki_ingester_memory_streams
```

## Best Practices for Dynamic Label Extraction

1. **Start with few labels**: Begin with 5-10 labels and add more only when needed
2. **Use label templates**: Combine multiple fields into categorical labels
3. **Test cardinality**: Monitor the number of unique label combinations
4. **Query-time extraction**: Use dynamic extraction for rare queries
5. **Document label schema**: Maintain documentation of extracted labels and their meanings

## Conclusion

Dynamic label extraction in Loki provides flexibility in indexing log content without modifying your applications or log collectors. By carefully selecting which fields to extract as labels and managing cardinality, you can build a powerful and efficient log indexing system. Remember that labels are primarily for filtering and grouping, not for storing detailed information. Keep high-cardinality data in the log lines themselves and extract it dynamically when needed.
