# How to Configure Log Filters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: Learn how to configure log filters in Rancher to include, exclude, transform, and enrich Kubernetes logs before forwarding.

Log filters in Rancher allow you to process log data before it reaches your storage destination. You can filter out noise, redact sensitive information, enrich logs with metadata, and transform log formats. This guide covers the various filter types available in Rancher's logging stack and how to configure them.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- A configured ClusterOutput or Output destination.
- Cluster admin for `ClusterFlow` and `ClusterOutput`, or project/namespace permissions for `Flow` and `Output`.

## Understanding Filters in Rancher Logging

Filters are defined within Flow and ClusterFlow resources. They are processed in order, with each filter's output becoming the next filter's input. Available filter types include:

- **grep**: Include or exclude logs based on patterns.
- **parser**: Parse unstructured log lines into structured data.
- **record_transformer**: Add, remove, or modify log fields.
- **tag_normaliser**: Modify the Fluentd tag.
- **throttle**: Rate-limit log volume.
- **dedot**: Replace dots in field names.
- **detectExceptions**: Detect and combine multi-line exception stack traces.

## Step 1: Filter Logs with Grep

### Include Only Matching Logs

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: error-logs-only
  namespace: cattle-logging-system
spec:
  filters:
    - grep:
        regexp:
          - key: log
            pattern: "(ERROR|FATAL|CRITICAL)"
  globalOutputRefs:
    - elasticsearch-output
```

### Exclude Matching Logs

```yaml
filters:
  - grep:
      exclude:
        - key: log
          pattern: "(healthcheck|GET /healthz|GET /readyz|GET /livez)"
```

### Combine Include and Exclude

```yaml
filters:
  # First exclude health checks
  - grep:
      exclude:
        - key: log
          pattern: "GET /health"
  # Then keep only errors and warnings
  - grep:
      regexp:
        - key: log
          pattern: "(ERROR|WARN|FATAL)"
```

### Filter by Kubernetes Labels

```yaml
spec:
  match:
    - select:
        labels:
          app: my-application
          tier: backend
    - exclude:
        labels:
          app: debug-tool
```

## Step 2: Transform Records

### Add Fields

```yaml
filters:
  - record_transformer:
      records:
        - cluster_name: "production-us-east-1"
          environment: "production"
          team: "platform"
          region: "us-east-1"
```

### Remove Fields

```yaml
filters:
  - record_transformer:
      remove_keys: "$.kubernetes.pod_id,$.kubernetes.docker_id,$.kubernetes.master_url"
```

### Copy or Derive Fields

```yaml
filters:
  - record_transformer:
      enable_ruby: true
      records:
        - severity: "${record['level']}"
        - app_name: "${record.dig('kubernetes', 'labels', 'app')}"
```

### Conditional Transformations

```yaml
filters:
  - record_transformer:
      enable_ruby: true
      records:
        - priority: "${record['level'] == 'ERROR' ? 'high' : record['level'] == 'WARN' ? 'medium' : 'low'}"
```

## Step 3: Redact Sensitive Data

Remove or mask sensitive information from logs:

```yaml
filters:
  # Remove fields that may contain sensitive data
  - record_transformer:
      remove_keys: "password,secret,token,api_key,authorization"

  # Mask credit card numbers
  - record_transformer:
      enable_ruby: true
      records:
        - log: "${record['log'].gsub(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, '****-****-****-****')}"

  # Mask email addresses
  - record_transformer:
      enable_ruby: true
      records:
        - log: "${record['log'].gsub(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/, '***@***.***')}"
```

## Step 4: Rate-Limit Log Volume

Use the throttle filter to limit log volume per group:

```yaml
filters:
  - throttle:
      group_key: "$.kubernetes.namespace_name"
      group_bucket_period_s: 60
      group_bucket_limit: 1000
      group_drop_logs: true
      group_reset_rate_s: 300
      group_warning_delay_s: 60
```

This limits each namespace to 1000 log lines per 60-second window, dropping excess logs.

## Step 5: Detect Multi-Line Exceptions

Stack traces and exception logs often span multiple lines. The detectExceptions filter combines them:

```yaml
filters:
  - detectExceptions:
      languages:
        - java
        - python
        - go
        - ruby
        - javascript
      multiline_flush_interval: 5
      max_lines: 500
      max_bytes: 500000
```

This filter recognizes exception patterns in multiple programming languages and merges the stack trace lines into a single log entry.

Note: `detectExceptions` is mutually exclusive with `tag_normaliser` in the same flow.

## Step 6: Normalize Tags

Customize the Fluentd tag used for routing:

```yaml
filters:
  - tag_normaliser:
      format: "${namespace_name}.${pod_name}.${container_name}"
```

Available placeholders:
- `${namespace_name}`
- `${pod_name}`
- `${container_name}`
- `${pod_id}`
- `${labels}`
- `${host}`
- `${docker_id}`

## Step 7: Replace Dots in Field Names

Some log destinations (like Elasticsearch) have issues with dots in field names. The dedot filter replaces them:

```yaml
filters:
  - dedot:
      de_dot_separator: "_"
      de_dot_nested: true
```

This converts field names like `kubernetes.io/name` to `kubernetes_io/name`.

## Step 8: Chain Multiple Filters

Combine filters in a processing pipeline:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: full-pipeline
  namespace: cattle-logging-system
spec:
  filters:
    # 1. Detect and merge multi-line exceptions
    - detectExceptions:
        languages: [java, python, go]

    # 2. Parse JSON log lines
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        emit_invalid_record_to_error: false

    # 3. Exclude health check noise
    - grep:
        exclude:
          - key: path
            pattern: "^/(healthz|readyz|livez|metrics)"

    # 4. Redact sensitive data
    - record_transformer:
        remove_keys: "password,token,secret"

    # 5. Add cluster metadata
    - record_transformer:
        records:
          - cluster: "production"
            environment: "prod"

    # 6. Rate limit per namespace
    - throttle:
        group_key: "$.kubernetes.namespace_name"
        group_bucket_period_s: 60
        group_bucket_limit: 5000

  globalOutputRefs:
    - elasticsearch-output
```

## Step 9: Filter by Container Name

Target logs from specific containers:

```yaml
spec:
  match:
    - select:
        container_names:
          - my-app
          - my-sidecar
    - exclude:
        container_names:
          - istio-proxy
          - envoy
```

## Step 10: Verify Filter Configuration

Check that filters are applied correctly:

```bash
# Check ClusterFlow status

kubectl get clusterflows -n cattle-logging-system -o yaml

# Check Fluentd configuration
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=100

# Look for filter-related errors
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=-1 | grep -Ei 'filter|error|warn'
```

To test filters, generate a known log message and verify it appears (or does not appear) at the destination:

```bash
kubectl run log-test --rm -it --restart=Never --image=busybox -- sh -c 'echo "TEST_FILTER_VERIFICATION: error level=ERROR"'
```

## Summary

Log filters in Rancher provide powerful log processing capabilities before data reaches your storage destination. Use grep filters to reduce noise, record_transformer to enrich and redact data, detectExceptions for multi-line stack traces, and throttle to control log volume. Chain multiple filters in a pipeline for comprehensive log processing. Always verify your filters are working correctly by checking Fluentd logs and testing with known log patterns.
