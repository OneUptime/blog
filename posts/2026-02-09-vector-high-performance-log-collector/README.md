# How to Configure Vector as a High-Performance Log Collector in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vector, Kubernetes, Logging

Description: Learn how to deploy and configure Vector as a high-performance log collector for Kubernetes with advanced transformations, routing, and buffering capabilities that outperform traditional log shippers.

---

Vector provides a modern alternative to Fluent Bit and Logstash, offering superior performance, built-in transformations, and a powerful pipeline language. Written in Rust, Vector handles high-volume log streams efficiently while providing sophisticated log processing capabilities. This guide shows you how to deploy Vector in Kubernetes for optimal log collection and processing.

## Understanding Vector Architecture

Vector organizes pipelines into three components:

- **Sources** - Collect data from files, syslog, or other inputs
- **Transforms** - Parse, filter, enrich, and modify data
- **Sinks** - Send data to Loki, Elasticsearch, S3, or other destinations

Vector's VRL (Vector Remap Language) provides powerful log transformation without the performance overhead of scripting languages.

## Deploying Vector DaemonSet

Deploy Vector to collect logs from all nodes:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vector
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vector
rules:
- apiGroups: [""]
  resources:
  - pods
  - namespaces
  - nodes
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: vector
subjects:
- kind: ServiceAccount
  name: vector
  namespace: logging
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
  namespace: logging
data:
  vector.yaml: |
    # Data directory
    data_dir: /var/lib/vector

    # Sources
    sources:
      kubernetes_logs:
        type: kubernetes_logs
        auto_partial_merge: true
        self_node_name: "${VECTOR_SELF_NODE_NAME}"

    # Transforms
    transforms:
      # Parse JSON logs
      parse_json:
        type: remap
        inputs: ["kubernetes_logs"]
        source: |
          # Try to parse log as JSON
          if is_string(.message) {
            parsed, err = parse_json(.message)
            if err == null {
              . = merge(., parsed)
              del(.message)
            }
          }

      # Add log level if missing
      normalize_level:
        type: remap
        inputs: ["parse_json"]
        source: |
          # Normalize log level
          .level = downcase(string!(.level ?? "info"))

          # Map common variations
          if .level == "warn" {
            .level = "warning"
          }

      # Enrich with Kubernetes metadata
      enrich_k8s:
        type: remap
        inputs: ["normalize_level"]
        source: |
          # Add cluster name
          .cluster = "production"

          # Extract deployment from pod name
          if .kubernetes.pod_name != null {
            .kubernetes.deployment = replace(string!(.kubernetes.pod_name), r'-[a-z0-9]{8,10}-[a-z0-9]{5}$', "")
          }

      # Filter out health checks
      filter_health_checks:
        type: filter
        inputs: ["enrich_k8s"]
        condition: |
          .kubernetes.container_name != "istio-proxy" ||
          !includes(string!(.message), "/health")

      # Sample debug logs
      sample_debug:
        type: sample
        inputs: ["filter_health_checks"]
        rate: 10
        key_field: "kubernetes.pod_name"
        condition: |
          .level == "debug"

    # Sinks
    sinks:
      # Send to Loki
      loki:
        type: loki
        inputs: ["sample_debug"]
        endpoint: "http://loki.logging.svc.cluster.local:3100"
        encoding:
          codec: json
        labels:
          namespace: "{{ kubernetes.namespace_name }}"
          pod: "{{ kubernetes.pod_name }}"
          container: "{{ kubernetes.container_name }}"
          level: "{{ level }}"
        batch:
          max_bytes: 1048576
          timeout_secs: 5
        buffer:
          type: disk
          max_size: 268435456  # 256 MB
          when_full: drop_newest

      # Send to OpenSearch
      opensearch:
        type: elasticsearch
        inputs: ["sample_debug"]
        endpoint: "https://opensearch.logging.svc.cluster.local:9200"
        mode: data_stream
        data_stream:
          type: logs
          dataset: kubernetes
          namespace: production
        bulk:
          index: "kubernetes-logs"
        batch:
          max_events: 1000
          timeout_secs: 5
        buffer:
          type: disk
          max_size: 536870912  # 512 MB

      # Export metrics
      prometheus_exporter:
        type: prometheus_exporter
        inputs: []
        address: "0.0.0.0:9090"
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: vector
  namespace: logging
spec:
  selector:
    matchLabels:
      app: vector
  template:
    metadata:
      labels:
        app: vector
    spec:
      serviceAccountName: vector
      containers:
      - name: vector
        image: timberio/vector:0.35.0-alpine
        args:
        - --config
        - /etc/vector/vector.yaml
        env:
        - name: VECTOR_SELF_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: VECTOR_LOG
          value: "info"
        ports:
        - containerPort: 9090
          name: metrics
          protocol: TCP
        volumeMounts:
        - name: config
          mountPath: /etc/vector
          readOnly: true
        - name: data
          mountPath: /var/lib/vector
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: vector-config
      - name: data
        emptyDir: {}
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
---
apiVersion: v1
kind: Service
metadata:
  name: vector-metrics
  namespace: logging
spec:
  selector:
    app: vector
  ports:
  - port: 9090
    name: metrics
```

## Advanced VRL Transformations

Use VRL for sophisticated log processing:

```yaml
transforms:
  # Extract HTTP request details
  parse_http:
    type: remap
    inputs: ["kubernetes_logs"]
    source: |
      # Parse nginx access log format
      parsed, err = parse_regex(.message, r'^(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<request>[^"]+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]+)"')

      if err == null {
        . = merge(., parsed)

        # Parse request into method, path, protocol
        request_parts = split(string!(.request), " ")
        .http_method = request_parts[0]
        .http_path = request_parts[1]
        .http_protocol = request_parts[2]

        # Convert numeric fields
        .status_code = to_int!(.status)
        .bytes_sent = to_int!(.body_bytes_sent)

        # Categorize status codes
        if .status_code >= 500 {
          .status_category = "5xx"
        } else if .status_code >= 400 {
          .status_category = "4xx"
        } else if .status_code >= 300 {
          .status_category = "3xx"
        } else if .status_code >= 200 {
          .status_category = "2xx"
        }

        del(.request)
        del(.status)
        del(.body_bytes_sent)
      }

  # Redact sensitive data
  redact_sensitive:
    type: remap
    inputs: ["parse_http"]
    source: |
      # Redact email addresses
      .message = replace(string!(.message), r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', "***@***.***")

      # Redact credit cards
      .message = replace(string!(.message), r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', "****-****-****-****")

      # Redact API keys
      .message = replace(string!(.message), r'\b[Aa]pi[_-]?[Kk]ey[:\s=]+[A-Za-z0-9_-]+', "api_key=***REDACTED***")

      # Redact bearer tokens
      .message = replace(string!(.message), r'Bearer [A-Za-z0-9_.-]+', "Bearer ***REDACTED***")

  # Calculate request duration
  calculate_duration:
    type: remap
    inputs: ["redact_sensitive"]
    source: |
      # If duration_ms exists, categorize it
      if exists(.duration_ms) {
        duration = to_float!(.duration_ms)

        if duration > 5000 {
          .duration_category = "very_slow"
        } else if duration > 1000 {
          .duration_category = "slow"
        } else if duration > 500 {
          .duration_category = "moderate"
        } else {
          .duration_category = "fast"
        }
      }

  # Aggregate error counts
  aggregate_errors:
    type: aggregate
    inputs: ["calculate_duration"]
    interval_ms: 60000  # 1 minute
    group_by:
      - "kubernetes.namespace_name"
      - "kubernetes.pod_name"
      - "level"
```

## Routing to Multiple Destinations

Route logs based on content:

```yaml
transforms:
  # Route based on log level
  route_by_level:
    type: route
    inputs: ["enrich_k8s"]
    route:
      error_logs: '.level == "error" || .level == "fatal"'
      warn_logs: '.level == "warn" || .level == "warning"'
      info_logs: '.level == "info"'
      debug_logs: '.level == "debug"'

  # Route based on namespace
  route_by_namespace:
    type: route
    inputs: ["enrich_k8s"]
    route:
      production: '.kubernetes.namespace_name == "production"'
      staging: '.kubernetes.namespace_name == "staging"'
      development: '!includes(["production", "staging"], .kubernetes.namespace_name)'

sinks:
  # Critical logs to PagerDuty
  pagerduty:
    type: http
    inputs: ["route_by_level.error_logs"]
    uri: "https://events.pagerduty.com/v2/enqueue"
    encoding:
      codec: json

  # Production logs to long-term storage
  s3_production:
    type: aws_s3
    inputs: ["route_by_namespace.production"]
    bucket: "kubernetes-logs-production"
    compression: gzip
    batch:
      max_bytes: 10485760  # 10 MB
      timeout_secs: 300

  # Development logs to console
  console_dev:
    type: console
    inputs: ["route_by_namespace.development"]
    encoding:
      codec: json
```

## Buffering and Reliability

Configure disk buffering for reliability:

```yaml
sinks:
  loki_reliable:
    type: loki
    inputs: ["enrich_k8s"]
    endpoint: "http://loki:3100"
    encoding:
      codec: json
    buffer:
      type: disk
      max_size: 1073741824  # 1 GB
      when_full: block  # Block when buffer is full
    batch:
      max_bytes: 1048576  # 1 MB
      max_events: 1000
      timeout_secs: 5
    request:
      timeout_secs: 60
      retry_attempts: 10
      retry_initial_backoff_secs: 1
      retry_max_duration_secs: 600
    healthcheck:
      enabled: true
```

## Monitoring Vector Performance

Vector exposes Prometheus metrics:

```yaml
# Prometheus scrape config
scrape_configs:
- job_name: 'vector'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - logging
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: vector
  - source_labels: [__meta_kubernetes_pod_ip]
    action: replace
    target_label: __address__
    replacement: $1:9090
```

Key metrics to monitor:

```promql
# Events processed per second
rate(vector_events_processed_total[5m])

# Events dropped
rate(vector_events_discarded_total[5m])

# Buffer usage
vector_buffer_byte_size / vector_buffer_max_size

# Processing latency
histogram_quantile(0.95, rate(vector_event_processing_duration_seconds_bucket[5m]))
```

## Conclusion

Vector provides high-performance log collection for Kubernetes with powerful transformation capabilities. Its VRL language enables sophisticated log processing without the performance overhead of scripting, while disk buffering ensures reliability. Deploy Vector for efficient log collection, advanced transformations, and flexible routing to multiple destinations, all while maintaining lower resource usage than traditional log shippers.
