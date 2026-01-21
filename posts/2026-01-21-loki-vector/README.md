# How to Ship Logs to Loki with Vector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Vector, Log Collection, Log Shipping, Observability, High Performance

Description: A comprehensive guide to shipping logs to Grafana Loki using Vector, a high-performance observability data pipeline for collecting, transforming, and routing logs.

---

Vector is a high-performance observability data pipeline built in Rust that can collect, transform, and route logs to Grafana Loki. Known for its speed, reliability, and flexibility, Vector offers a modern alternative to traditional log shippers with first-class Loki support. This guide covers everything from basic setup to advanced configurations.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki instance running and accessible
- Vector 0.34 or later installed
- Understanding of TOML configuration format
- Access to systems where logs need to be collected

## Installing Vector

### Script Installation

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://sh.vector.dev | bash
```

### Package Installation (Ubuntu/Debian)

```bash
bash -c "$(curl -L https://setup.vector.dev)"
apt-get install vector
```

### Docker Installation

```bash
docker run -d \
  --name vector \
  -v $(pwd)/vector.toml:/etc/vector/vector.toml \
  -v /var/log:/var/log:ro \
  timberio/vector:0.34.1-alpine
```

### Kubernetes Helm Installation

```bash
helm repo add vector https://helm.vector.dev
helm install vector vector/vector \
  --namespace logging \
  --create-namespace
```

## Basic Configuration

Create a basic `vector.toml`:

```toml
[sources.logs]
type = "file"
include = ["/var/log/*.log"]

[sinks.loki]
type = "loki"
inputs = ["logs"]
endpoint = "http://loki:3100"
encoding.codec = "text"

[sinks.loki.labels]
job = "vector"
host = "{{ host }}"
```

## Configuration Deep Dive

### Sources

#### File Source

```toml
[sources.app_logs]
type = "file"
include = ["/var/log/app/**/*.log"]
exclude = ["/var/log/app/**/*.gz"]
ignore_older_secs = 86400
read_from = "beginning"
fingerprint.strategy = "device_and_inode"
max_line_bytes = 102400
line_delimiter = "\n"

# Multi-line configuration
multiline.start_pattern = '^\d{4}-\d{2}-\d{2}'
multiline.condition_pattern = '^[\s\t]+'
multiline.mode = "continue_through"
multiline.timeout_ms = 1000
```

#### Journald Source

```toml
[sources.journal]
type = "journald"
include_units = ["docker.service", "kubelet.service", "sshd.service"]
exclude_units = ["systemd-*"]
current_boot_only = true
```

#### Docker Logs Source

```toml
[sources.docker]
type = "docker_logs"
include_containers = ["app-*", "api-*"]
exclude_containers = ["*-sidecar"]
include_labels = ["com.docker.compose.service"]
auto_partial_merge = true
multiline.start_pattern = '^\d{4}-\d{2}-\d{2}'
multiline.mode = "halt_before"
multiline.condition_pattern = '^\d{4}-\d{2}-\d{2}'
multiline.timeout_ms = 1000
```

#### Kubernetes Logs Source

```toml
[sources.kubernetes]
type = "kubernetes_logs"
self_node_name = "${VECTOR_SELF_NODE_NAME}"
exclude_paths_glob_patterns = [
  "**/kube-system/**",
  "**/monitoring/**"
]
pod_annotation_fields.pod_labels = "pod_labels"
namespace_annotation_fields.namespace_labels = "namespace_labels"
auto_partial_merge = true
```

#### Syslog Source

```toml
[sources.syslog]
type = "syslog"
address = "0.0.0.0:514"
mode = "tcp"
max_length = 102400

[sources.syslog_udp]
type = "syslog"
address = "0.0.0.0:514"
mode = "udp"
```

#### HTTP Source

```toml
[sources.http]
type = "http_server"
address = "0.0.0.0:8080"
encoding = "json"
headers = ["X-Custom-Header"]
path = "/logs"
```

### Transforms

#### Remap Transform (VRL)

Vector Remap Language (VRL) provides powerful log transformation:

```toml
[transforms.parse_logs]
type = "remap"
inputs = ["app_logs"]
source = '''
# Parse JSON logs
. = parse_json!(.message)

# Add timestamp if missing
if !exists(.timestamp) {
  .timestamp = now()
}

# Normalize log level
.level = downcase(.level) ?? "info"

# Extract trace ID
if exists(.message) {
  .trace_id = parse_regex(.message, r'trace_id=(?P<id>[a-f0-9]+)')?.id
}

# Add metadata
.environment = "production"
.cluster = get_env_var!("CLUSTER_NAME")

# Redact sensitive data
.message = redact(.message, filters: [
  r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
  r'password\s*=\s*\S+',
  r'\b\d{16}\b'
])
'''
```

#### Filter Transform

```toml
# Filter by log level
[transforms.filter_errors]
type = "filter"
inputs = ["parse_logs"]
condition = '.level == "error" || .level == "fatal"'

# Filter out health checks
[transforms.filter_health]
type = "filter"
inputs = ["parse_logs"]
condition = '!match(.message, r"healthcheck|health_check|/health")'

# Filter by namespace
[transforms.filter_production]
type = "filter"
inputs = ["kubernetes"]
condition = '.kubernetes.namespace_labels.environment == "production"'
```

#### Route Transform

```toml
[transforms.route]
type = "route"
inputs = ["parse_logs"]

[transforms.route.route]
errors = '.level == "error" || .level == "fatal"'
warnings = '.level == "warn" || .level == "warning"'
debug = '.level == "debug" || .level == "trace"'
# Default route for everything else: _unmatched
```

#### Reduce Transform (Aggregation)

```toml
[transforms.aggregate_errors]
type = "reduce"
inputs = ["filter_errors"]
group_by = ["service", "error_type"]
merge_strategies.count = "sum"
expire_after_ms = 60000
flush_period_ms = 10000
```

#### Dedupe Transform

```toml
[transforms.dedupe]
type = "dedupe"
inputs = ["parse_logs"]
fields.match = ["message", "service"]
cache.num_events = 5000
```

#### Throttle Transform

```toml
[transforms.throttle]
type = "throttle"
inputs = ["parse_logs"]
key_field = "service"
threshold = 1000
window_secs = 1
```

#### Sample Transform

```toml
[transforms.sample]
type = "sample"
inputs = ["parse_logs"]
rate = 10  # Keep 1 in 10 logs
exclude.type = "vrl"
exclude.source = '.level == "error"'  # Always keep errors
```

### Loki Sink Configuration

#### Basic Loki Sink

```toml
[sinks.loki]
type = "loki"
inputs = ["parse_logs"]
endpoint = "http://loki:3100"
encoding.codec = "json"

[sinks.loki.labels]
job = "vector"
```

#### Complete Loki Sink Configuration

```toml
[sinks.loki]
type = "loki"
inputs = ["parse_logs"]
endpoint = "http://loki-gateway.loki.svc.cluster.local"

# Encoding
encoding.codec = "json"
encoding.timestamp_format = "rfc3339"

# Labels
[sinks.loki.labels]
job = "{{ service }}"
level = "{{ level }}"
environment = "production"
host = "{{ host }}"
namespace = "{{ kubernetes.namespace_name }}"

# Tenant
tenant_id = "production"

# Authentication
auth.strategy = "basic"
auth.user = "admin"
auth.password = "${LOKI_PASSWORD}"

# TLS
tls.crt_file = "/certs/client.crt"
tls.key_file = "/certs/client.key"
tls.ca_file = "/certs/ca.crt"
tls.verify_certificate = true

# Batching
batch.max_bytes = 1048576
batch.max_events = 10000
batch.timeout_secs = 1

# Buffer
buffer.type = "disk"
buffer.max_size = 268435488
buffer.when_full = "block"

# Request settings
request.concurrency = 10
request.rate_limit_duration_secs = 1
request.rate_limit_num = 100
request.retry_initial_backoff_secs = 1
request.retry_max_duration_secs = 300
request.timeout_secs = 60
```

#### Multiple Loki Sinks

```toml
# Production logs
[sinks.loki_production]
type = "loki"
inputs = ["route.errors", "route.warnings"]
endpoint = "http://loki-prod:3100"
tenant_id = "production"

[sinks.loki_production.labels]
job = "production"
level = "{{ level }}"

# Debug logs to separate instance
[sinks.loki_debug]
type = "loki"
inputs = ["route.debug"]
endpoint = "http://loki-debug:3100"
tenant_id = "debug"

[sinks.loki_debug.labels]
job = "debug"
```

## Complete Production Configuration

```toml
# Vector configuration for production Kubernetes deployment
# /etc/vector/vector.toml

[api]
enabled = true
address = "0.0.0.0:8686"
playground = false

# Data directory for buffers and checkpoints
data_dir = "/var/lib/vector"

# Kubernetes logs source
[sources.kubernetes_logs]
type = "kubernetes_logs"
self_node_name = "${VECTOR_SELF_NODE_NAME}"
exclude_paths_glob_patterns = [
  "**/kube-system_coredns-*",
  "**/kube-system_kube-proxy-*"
]
auto_partial_merge = true

# Journald for system logs
[sources.journald]
type = "journald"
include_units = ["kubelet", "docker", "containerd"]
current_boot_only = true

# Internal metrics
[sources.internal_metrics]
type = "internal_metrics"
namespace = "vector"

# Parse and enrich Kubernetes logs
[transforms.parse_k8s]
type = "remap"
inputs = ["kubernetes_logs"]
source = '''
# Try to parse as JSON
parsed, err = parse_json(.message)
if err == null {
  . = merge(., parsed)
  del(.message)
}

# Normalize level
.level = downcase(.level) ?? "info"

# Extract Kubernetes metadata
.namespace = .kubernetes.pod_namespace
.pod = .kubernetes.pod_name
.container = .kubernetes.container_name
.app = .kubernetes.pod_labels.app ?? .kubernetes.pod_labels."app.kubernetes.io/name" ?? "unknown"

# Clean up kubernetes object
del(.kubernetes.pod_labels."pod-template-hash")
del(.kubernetes.pod_labels."controller-revision-hash")

# Add cluster info
.cluster = get_env_var("CLUSTER_NAME") ?? "default"
.node = get_env_var("VECTOR_SELF_NODE_NAME") ?? "unknown"
'''

# Parse journald logs
[transforms.parse_journald]
type = "remap"
inputs = ["journald"]
source = '''
.level = downcase(.PRIORITY) ?? "info"
.service = ._SYSTEMD_UNIT ?? "unknown"
.hostname = .host
del(._SYSTEMD_UNIT)
del(.PRIORITY)
'''

# Filter out noisy logs
[transforms.filter_noise]
type = "filter"
inputs = ["parse_k8s"]
condition = '''
!match(string!(.message) ?? "", r"(healthcheck|readiness|liveness|/health|/ready|/live)") &&
.namespace != "kube-system"
'''

# Route by log level
[transforms.route_by_level]
type = "route"
inputs = ["filter_noise"]

[transforms.route_by_level.route]
errors = '.level == "error" || .level == "fatal" || .level == "critical"'
warnings = '.level == "warn" || .level == "warning"'
info = '.level == "info"'
debug = '.level == "debug" || .level == "trace"'

# Throttle debug logs
[transforms.throttle_debug]
type = "throttle"
inputs = ["route_by_level.debug"]
threshold = 100
window_secs = 1
key_field = "pod"

# Sample info logs (keep 1 in 5)
[transforms.sample_info]
type = "sample"
inputs = ["route_by_level.info"]
rate = 5

# Loki sink for errors (always sent)
[sinks.loki_errors]
type = "loki"
inputs = ["route_by_level.errors"]
endpoint = "http://loki-gateway.loki.svc.cluster.local"
tenant_id = "production"
encoding.codec = "json"

[sinks.loki_errors.labels]
job = "kubernetes"
level = "{{ level }}"
namespace = "{{ namespace }}"
app = "{{ app }}"

batch.max_bytes = 1048576
batch.timeout_secs = 1

buffer.type = "disk"
buffer.max_size = 536870912
buffer.when_full = "block"

# Loki sink for warnings
[sinks.loki_warnings]
type = "loki"
inputs = ["route_by_level.warnings"]
endpoint = "http://loki-gateway.loki.svc.cluster.local"
tenant_id = "production"
encoding.codec = "json"

[sinks.loki_warnings.labels]
job = "kubernetes"
level = "{{ level }}"
namespace = "{{ namespace }}"
app = "{{ app }}"

batch.max_bytes = 1048576
batch.timeout_secs = 1

# Loki sink for sampled info logs
[sinks.loki_info]
type = "loki"
inputs = ["sample_info"]
endpoint = "http://loki-gateway.loki.svc.cluster.local"
tenant_id = "production"
encoding.codec = "json"

[sinks.loki_info.labels]
job = "kubernetes"
level = "{{ level }}"
namespace = "{{ namespace }}"

batch.max_bytes = 2097152
batch.timeout_secs = 2

# Loki sink for throttled debug logs
[sinks.loki_debug]
type = "loki"
inputs = ["throttle_debug"]
endpoint = "http://loki-gateway.loki.svc.cluster.local"
tenant_id = "production"
encoding.codec = "json"

[sinks.loki_debug.labels]
job = "kubernetes"
level = "debug"
namespace = "{{ namespace }}"

batch.max_bytes = 2097152
batch.timeout_secs = 5

# System logs to Loki
[sinks.loki_system]
type = "loki"
inputs = ["parse_journald"]
endpoint = "http://loki-gateway.loki.svc.cluster.local"
tenant_id = "production"
encoding.codec = "json"

[sinks.loki_system.labels]
job = "system"
service = "{{ service }}"

# Prometheus metrics sink
[sinks.prometheus]
type = "prometheus_exporter"
inputs = ["internal_metrics"]
address = "0.0.0.0:9090"
```

## Kubernetes Deployment

### DaemonSet

```yaml
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
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: vector
      containers:
        - name: vector
          image: timberio/vector:0.34.1-alpine
          args:
            - --config-dir
            - /etc/vector/
          env:
            - name: VECTOR_SELF_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: CLUSTER_NAME
              value: production
            - name: VECTOR_LOG
              value: info
          ports:
            - name: api
              containerPort: 8686
            - name: metrics
              containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /etc/vector
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
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: api
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: api
            initialDelaySeconds: 10
            periodSeconds: 10
      tolerations:
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      volumes:
        - name: config
          configMap:
            name: vector-config
        - name: data
          hostPath:
            path: /var/lib/vector
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

### ServiceAccount and RBAC

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
    resources: ["namespaces", "nodes", "pods"]
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
```

## Monitoring Vector

### Metrics Endpoint

```bash
# Health check
curl http://localhost:8686/health

# Prometheus metrics
curl http://localhost:9090/metrics

# API endpoints
curl http://localhost:8686/graphql
```

### Key Metrics

```promql
# Events processed
rate(vector_component_received_events_total[5m])

# Bytes sent to Loki
rate(vector_component_sent_bytes_total{component_id="loki"}[5m])

# Errors
rate(vector_component_errors_total[5m])

# Buffer usage
vector_buffer_events
vector_buffer_byte_size
```

## Troubleshooting

### Validate Configuration

```bash
vector validate /etc/vector/vector.toml
```

### Test Configuration

```bash
vector tap --outputs-of parse_logs
```

### Enable Debug Logging

```bash
VECTOR_LOG=debug vector --config /etc/vector/vector.toml
```

### Common Issues

**Connection Refused**:
- Check endpoint URL
- Verify network connectivity
- Check TLS configuration

**Buffer Full**:
- Increase buffer size
- Check Loki availability
- Review rate limits

**Missing Logs**:
- Verify file permissions
- Check include/exclude patterns
- Review filter conditions

## Conclusion

Vector provides a high-performance, flexible solution for shipping logs to Loki. Key takeaways:

- Use VRL for powerful log transformation
- Configure routing for different log streams
- Implement sampling and throttling to control costs
- Use disk buffers for reliability
- Monitor Vector metrics for pipeline health
- Leverage Kubernetes-native sources for container logs

With Vector's performance characteristics and rich feature set, you can build robust log pipelines that scale with your infrastructure needs.
