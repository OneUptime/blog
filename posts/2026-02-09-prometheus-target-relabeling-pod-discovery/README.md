# How to Configure Prometheus Target Relabeling for Dynamic Kubernetes Pod Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Monitoring

Description: Master Prometheus target relabeling for Kubernetes pod discovery to automatically discover and scrape metrics from dynamic workloads with proper labels and filtering.

---

Kubernetes pods come and go dynamically, making static scrape configurations impractical. Prometheus target relabeling solves this challenge by automatically discovering pods, filtering targets based on annotations, and enriching metrics with useful labels. This guide teaches you how to build sophisticated relabeling configurations that adapt to your dynamic Kubernetes environment.

## Understanding Target Relabeling

Prometheus service discovery finds targets (pods, services, nodes), but relabeling transforms the discovered metadata before scraping begins. Relabeling can:

- Filter targets based on annotations or labels
- Add or modify metric labels
- Change scrape parameters like path or port
- Organize targets by team, environment, or function

The relabeling happens in two phases: before scraping (target relabeling) and after scraping (metric relabeling).

## Basic Pod Discovery Configuration

Start with a simple pod discovery configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod

      relabel_configs:
      # Keep only pods with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Use custom scrape path if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Use custom port if specified
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

      # Add pod name label
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

      # Add container name
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
```

With this configuration, pods opt-in to metrics scraping by adding annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-app
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  containers:
  - name: app
    image: example:latest
    ports:
    - containerPort: 8080
```

## Advanced Filtering with Multiple Conditions

Filter targets based on complex conditions:

```yaml
relabel_configs:
# Keep only pods in specific namespaces
- source_labels: [__meta_kubernetes_namespace]
  action: keep
  regex: production|staging

# Drop pods with specific labels
- source_labels: [__meta_kubernetes_pod_label_monitoring]
  action: drop
  regex: disabled

# Keep only pods with Ready containers
- source_labels: [__meta_kubernetes_pod_ready]
  action: keep
  regex: true

# Filter by pod phase
- source_labels: [__meta_kubernetes_pod_phase]
  action: keep
  regex: Running

# Keep pods from specific deployments
- source_labels: [__meta_kubernetes_pod_controller_name]
  action: keep
  regex: (frontend|backend|api)-.+
```

## Enriching Metrics with Kubernetes Metadata

Add useful labels to metrics for better querying:

```yaml
relabel_configs:
# Add deployment name
- source_labels: [__meta_kubernetes_pod_label_app]
  target_label: app

# Add version/release label
- source_labels: [__meta_kubernetes_pod_label_version]
  target_label: version

# Add environment label
- source_labels: [__meta_kubernetes_pod_label_environment]
  target_label: environment

# Add team ownership
- source_labels: [__meta_kubernetes_pod_label_team]
  target_label: team

# Add node name
- source_labels: [__meta_kubernetes_pod_node_name]
  target_label: node

# Combine multiple labels into a single identifier
- source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_pod_label_app]
  separator: '/'
  target_label: service
```

## Creating Job-Specific Scrape Configurations

Organize different workload types into separate jobs:

```yaml
scrape_configs:
# Scrape application pods
- job_name: 'kubernetes-pods-app'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - production
      - staging

  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_label_component]
    action: keep
    regex: application

  # Standard relabeling rules here

# Scrape infrastructure pods separately
- job_name: 'kubernetes-pods-infra'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - kube-system
      - monitoring

  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_label_component]
    action: keep
    regex: infrastructure

# Scrape database pods with different interval
- job_name: 'kubernetes-pods-database'
  scrape_interval: 30s
  kubernetes_sd_configs:
  - role: pod

  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_component]
    action: keep
    regex: database
```

## Dynamic Port Selection

Handle pods with multiple ports intelligently:

```yaml
relabel_configs:
# Use named port if available
- source_labels: [__meta_kubernetes_pod_container_port_name]
  action: keep
  regex: metrics|prometheus

# Fall back to annotation-specified port
- source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
  action: replace
  regex: ([^:]+)(?::\d+)?;(\d+)
  replacement: $1:$2
  target_label: __address__

# Use first port as last resort
- source_labels: [__address__]
  action: replace
  regex: ([^:]+):(\d+)
  replacement: $1
  target_label: __address__
```

## Multi-Container Pod Handling

Properly handle pods with multiple containers:

```yaml
relabel_configs:
# Keep all containers in pod
- source_labels: [__meta_kubernetes_pod_container_port_name]
  regex: metrics.*
  action: keep

# Add container-specific labels
- source_labels: [__meta_kubernetes_pod_container_name]
  target_label: container

# Create unique instance identifier per container
- source_labels: [__meta_kubernetes_pod_name, __meta_kubernetes_pod_container_name]
  separator: '/'
  target_label: instance

# Handle sidecar containers differently
- source_labels: [__meta_kubernetes_pod_container_name]
  regex: (istio-proxy|envoy)
  target_label: sidecar
  replacement: 'true'
```

## Scraping Based on Service Discovery

Use service-level discovery with pod relabeling:

```yaml
scrape_configs:
- job_name: 'kubernetes-service-endpoints'
  kubernetes_sd_configs:
  - role: endpoints

  relabel_configs:
  # Keep only endpoints with service annotation
  - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
    action: keep
    regex: true

  # Get scrape port from service annotation
  - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
    target_label: __address__

  # Get scrape path from service annotation
  - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)

  # Add service name as job label
  - source_labels: [__meta_kubernetes_service_name]
    target_label: service

  # Add endpoint pod information
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod

  # Preserve endpoint address as instance
  - source_labels: [__address__]
    target_label: instance
```

## Implementing Custom Scrape Schemes

Support HTTPS scraping with custom TLS configuration:

```yaml
relabel_configs:
# Use HTTPS for specific pods
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scheme]
  action: replace
  target_label: __scheme__
  regex: (https?)

# Configure TLS verification
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_tls_skip_verify]
  action: replace
  target_label: __param_tls_skip_verify
  regex: (true|false)
```

Configure TLS at the job level:

```yaml
scrape_configs:
- job_name: 'kubernetes-pods-https'
  kubernetes_sd_configs:
  - role: pod

  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    insecure_skip_verify: false

  bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

  relabel_configs:
  # Only scrape pods requiring TLS
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scheme]
    action: keep
    regex: https
```

## Handling StatefulSets and Headless Services

Special handling for StatefulSet pods:

```yaml
relabel_configs:
# Extract StatefulSet ordinal
- source_labels: [__meta_kubernetes_pod_name]
  regex: (.+)-([0-9]+)
  replacement: $2
  target_label: statefulset_ordinal

# Extract StatefulSet name
- source_labels: [__meta_kubernetes_pod_name]
  regex: (.+)-[0-9]+
  replacement: $1
  target_label: statefulset_name

# Use stable network identity for StatefulSets
- source_labels: [__meta_kubernetes_pod_name, __meta_kubernetes_namespace, __meta_kubernetes_service_name]
  regex: (.+);(.+);(.+)
  replacement: $1.$3.$2.svc.cluster.local
  target_label: __address__
```

## Debugging Relabeling Rules

Use these techniques to debug relabeling:

```yaml
# Preserve original labels for debugging
relabel_configs:
- source_labels: [__address__]
  target_label: __tmp_address
  action: replace

- source_labels: [__metrics_path__]
  target_label: __tmp_path
  action: replace

# Log all discovered metadata (temporarily)
- action: labelmap
  regex: __meta_kubernetes_pod_(.+)
```

Query Prometheus targets endpoint to see relabeling results:

```bash
# Check discovered targets
curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | {labels: .labels, discoveredLabels: .discoveredLabels}'
```

## Metric Relabeling Post-Scrape

Apply transformations after scraping:

```yaml
scrape_configs:
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
  - role: pod

  # ... target relabeling ...

  metric_relabel_configs:
  # Drop specific metrics
  - source_labels: [__name__]
    regex: 'go_.*|process_.*'
    action: drop

  # Rename metric labels
  - source_labels: [pod_name]
    target_label: pod
    action: replace

  # Drop high-cardinality labels
  - regex: 'user_id|session_id'
    action: labeldrop
```

## Complete Production Example

A comprehensive configuration combining all concepts:

```yaml
scrape_configs:
- job_name: 'kubernetes-pods-production'
  scrape_interval: 15s
  scrape_timeout: 10s

  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names: [production]

  relabel_configs:
  # Opt-in via annotation
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true

  # Only scrape running pods
  - source_labels: [__meta_kubernetes_pod_phase]
    action: keep
    regex: Running

  # Custom port and path
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
    target_label: __address__

  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
    replacement: $1

  # Add standard labels
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
  - source_labels: [__meta_kubernetes_pod_label_app]
    target_label: app
  - source_labels: [__meta_kubernetes_pod_label_version]
    target_label: version
  - source_labels: [__meta_kubernetes_pod_node_name]
    target_label: node

  metric_relabel_configs:
  # Drop noisy metrics
  - source_labels: [__name__]
    regex: 'go_(gc|memstats).*'
    action: drop

  # Limit cardinality
  - source_labels: [__name__, user_id]
    regex: 'http_requests_total;.*'
    action: drop
```

## Conclusion

Prometheus target relabeling for Kubernetes pod discovery transforms chaotic dynamic environments into organized, well-labeled metric collections. By combining service discovery with intelligent filtering, enrichment, and organization, you create a scalable monitoring system that adapts automatically as pods come and go.

Start with basic annotation-based opt-in, then expand to multi-container handling, service-based discovery, and advanced filtering. Use metric relabeling to control cardinality and optimize storage. The result is a robust monitoring configuration that scales with your Kubernetes clusters while keeping metrics organized and queryable.
