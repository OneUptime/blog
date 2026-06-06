# How to Configure the Kubelet Stats Receiver in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Kubelet, Stats, Receiver, Kubernetes, Pod

Description: Configure the Kubelet Stats Receiver to collect detailed pod and container resource metrics including CPU, memory, network, and filesystem usage from Kubernetes nodes.

The Kubelet Stats Receiver collects resource usage metrics directly from the Kubelet on each Kubernetes node. It provides detailed CPU, memory, network, and filesystem metrics for pods, containers, and nodes. This receiver is essential for understanding actual resource consumption, identifying resource-constrained workloads, and rightsizing container requests and limits.

## Understanding Kubelet Metrics

Every Kubernetes node runs a Kubelet, which manages pods and containers on that node. The Kubelet exposes a `/stats/summary` endpoint that provides real-time resource usage data for:

- Node-level resource consumption (total CPU, memory, disk usage)
- Pod-level aggregate metrics (total resources used by all containers in a pod)
- Container-level detailed metrics (per-container CPU, memory, and filesystem usage)
- Volume metrics (persistent volume usage)

Unlike the Kubernetes Cluster Receiver which reports desired state (how many replicas should exist), the Kubelet Stats Receiver reports actual resource consumption (how much CPU and memory pods are actually using right now).

## Architecture Overview

Here's how the Kubelet Stats Receiver works:

```mermaid
graph LR
    A[Kubelet on Node 1] --> B[Collector DaemonSet Pod 1]
    C[Kubelet on Node 2] --> D[Collector DaemonSet Pod 2]
    E[Kubelet on Node N] --> F[Collector DaemonSet Pod N]

    B --> G[Processors]
    D --> G
    F --> G

    G --> H[Exporters]
    H --> I[Backend System]
```

The receiver runs as a DaemonSet, with one collector pod per node. Each collector queries the local Kubelet's stats endpoint to gather metrics for all pods on that node.

## Basic Configuration

Start with a minimal configuration:

```yaml
# Basic Kubelet Stats Receiver configuration

# Collects metrics from the local node's Kubelet
receivers:
  kubelet_stats:
    # Authentication method
    auth_type: serviceAccount

    # Kubelet endpoint (use node name)
    endpoint: https://${env:K8S_NODE_NAME}:10250

    # Skip TLS verification (not recommended for production)
    insecure_skip_verify: true

    # Collection interval
    collection_interval: 30s

    # Metric groups to collect
    metric_groups:
      - node
      - pod
      - container

processors:
  batch:
    timeout: 10s

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [kubelet_stats]
      processors: [batch]
      exporters: [debug]
```

The `K8S_NODE_NAME` environment variable is typically set by Kubernetes' downward API, allowing each DaemonSet pod to discover its node name.

## Authentication Methods

The receiver supports multiple authentication approaches:

```yaml
# Service account authentication (recommended)
# Uses the pod's mounted service account token
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
```

```yaml
# TLS certificate authentication
# Uses client certificates for Kubelet authentication
receivers:
  kubelet_stats:
    auth_type: tls
    endpoint: https://${env:K8S_NODE_NAME}:10250
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    cert_file: /etc/otelcol/certs/tls.crt
    key_file: /etc/otelcol/certs/tls.key
    collection_interval: 30s
```

```yaml
# Kubeconfig authentication (for development)
receivers:
  kubelet_stats:
    auth_type: kubeConfig
    endpoint: ${env:K8S_NODE_NAME}
    collection_interval: 30s
```

With `kubeConfig` authentication, the endpoint should be the node name only because the receiver reaches the Kubelet through the Kubernetes API server proxy configured in the kubeconfig.

In production, use `serviceAccount` authentication with appropriate RBAC permissions. This leverages Kubernetes' built-in security mechanisms.

## Metric Groups

Control which metric categories to collect:

```yaml
# Select specific metric groups to reduce cardinality
# Each group provides different granularity
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s

    # Available metric groups:
    # - node: Node-level metrics (CPU, memory, filesystem, network)
    # - pod: Pod-level aggregate metrics
    # - container: Per-container detailed metrics
    # - volume: Persistent volume usage metrics
    metric_groups:
      - node
      - pod
      - container
      - volume
```

Each metric group increases cardinality:

- `node`: One set of metrics per node (lowest cardinality)
- `pod`: One set per pod (medium cardinality)
- `container`: One set per container (high cardinality)
- `volume`: One set per volume (variable cardinality)

Start with `node` and `pod` for basic monitoring, add `container` when you need detailed per-container visibility.

## Node Metrics

Node-level metrics show overall node resource consumption:

```yaml
# Node metrics provide host-level resource usage
# Useful for capacity planning and node health monitoring
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - node

# Example node metrics collected:
# - k8s.node.cpu.usage: CPU usage in cores
# - k8s.node.cpu.time: Cumulative CPU time in seconds
# - k8s.node.memory.usage: Memory usage in bytes
# - k8s.node.memory.available: Available memory
# - k8s.node.memory.working_set: Working set memory (used by kernel for OOM decisions)
# - k8s.node.filesystem.usage: Filesystem usage in bytes
# - k8s.node.filesystem.available: Available filesystem space
# - k8s.node.network.io: Network bytes transmitted/received
```

The `working_set` memory metric is particularly important because Kubernetes uses it to determine when to evict pods due to memory pressure.

## Pod Metrics

Pod-level metrics aggregate resource usage across all containers in a pod:

```yaml
# Pod metrics aggregate container usage within each pod
# Useful for application-level monitoring
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - pod

# Example pod metrics collected:
# - k8s.pod.cpu.usage: Total CPU usage for all containers in cores
# - k8s.pod.cpu.time: Cumulative CPU time in seconds
# - k8s.pod.memory.usage: Total memory usage
# - k8s.pod.memory.working_set: Working set memory
# - k8s.pod.memory.rss: Resident set size
# - k8s.pod.memory.page_faults: Page faults (major and minor)
# - k8s.pod.network.io: Network traffic
# - k8s.pod.network.errors: Network errors
```

Pod metrics help answer questions like "Which pods are consuming the most CPU?" and "Which applications are nearing their memory limits?"

## Container Metrics

Container-level metrics provide the highest granularity:

```yaml
# Container metrics show per-container resource usage
# Highest cardinality but most detailed visibility
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - container

# Example container metrics collected:
# - container.cpu.usage: CPU usage per container in cores
# - container.cpu.time: Cumulative CPU time in seconds
# - container.memory.usage: Memory usage per container
# - container.memory.working_set: Working set memory
# - container.memory.rss: Resident set size
# - container.memory.page_faults: Page faults
# - container.filesystem.usage: Container filesystem usage
```

Container metrics are essential for identifying which specific containers in a multi-container pod are consuming resources or experiencing issues.

## Volume Metrics

Volume metrics track persistent volume usage:

```yaml
# Volume metrics monitor persistent volume consumption
# Critical for preventing "disk full" issues
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - volume

# Example volume metrics collected:
# - k8s.volume.available: Available bytes in volume
# - k8s.volume.capacity: Total volume capacity
# - k8s.volume.inodes.used: Used inodes
# - k8s.volume.inodes.free: Free inodes
```

Volume metrics help prevent disk space issues that can crash databases and other stateful applications.

## Collection Interval

Choose an appropriate collection interval:

```yaml
# Balance freshness vs overhead
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true

    # Collection interval options:
    # 10s: High resolution (use for critical workloads)
    # 30s: Standard monitoring (recommended default)
    # 60s: Low overhead (sufficient for most cases)
    collection_interval: 30s
```

Shorter intervals provide better resolution for troubleshooting but increase Kubelet load and metric volume. For production, 30-60 seconds typically provides good balance.

## TLS Configuration

Secure communication with the Kubelet:

```yaml
# Production TLS configuration
# Validates Kubelet certificate for security
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250

    # Validate Kubelet certificate
    insecure_skip_verify: false

    # CA certificate for validation
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt

    collection_interval: 30s
    metric_groups:
      - node
      - pod
      - container
```

In production, avoid `insecure_skip_verify: true`. Instead, configure proper certificate validation. The service account CA certificate is automatically mounted into pods.

## Resource Attributes

The receiver automatically adds Kubernetes metadata:

```yaml
# Automatic metadata enrichment
# These attributes are added automatically to all metrics:
# - k8s.node.name: Node name
# - k8s.namespace.name: Namespace (for pod/container metrics)
# - k8s.pod.name: Pod name (for pod/container metrics)
# - k8s.pod.uid: Pod UID
# - k8s.container.name: Container name (for container metrics)
# - k8s.volume.name: Volume name (for volume metrics)
# - k8s.persistentvolumeclaim.name: PVC name (for volume metrics)

# Add container IDs by enabling extra metadata labels
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    extra_metadata_labels:
      - container.id

# Additional enrichment with processors
processors:
  resource:
    attributes:
      - key: k8s.cluster.name
        value: ${CLUSTER_NAME}
        action: insert

      - key: deployment.environment
        value: production
        action: insert

exporters:
  otlp:
    endpoint: https://backend.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [kubelet_stats]
      processors: [resource]
      exporters: [otlp]
```

These attributes enable filtering and aggregation by namespace, pod, container, volume, or PVC.

## Kubernetes Attributes Processor

Enhance metrics with additional Kubernetes metadata:

```yaml
# Enrich with deployment, service, and label metadata
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - pod
      - container

processors:
  # Add pod metadata from Kubernetes API
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.statefulset.name
        - k8s.daemonset.name
        - k8s.job.name
        - k8s.cronjob.name
        - k8s.replicaset.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.node.name
      labels:
        - tag_name: app
          key: app
          from: pod
        - tag_name: version
          key: version
          from: pod

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: https://backend.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [kubelet_stats]
      processors: [k8sattributes, batch]
      exporters: [otlp]
```

The k8sattributes processor queries the Kubernetes API to add controller names (Deployment, StatefulSet, etc.) and pod labels as metric attributes.

## RBAC Configuration

The receiver needs specific permissions:

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector-kubeletstats
  namespace: observability
---
# ClusterRole for Kubelet stats access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector-kubeletstats
rules:
  # Permission to get node metrics from Kubelet
  - apiGroups: [""]
    resources: ["nodes/stats"]
    verbs: ["get"]

  # Permission to list nodes (for k8sattributes processor)
  - apiGroups: [""]
    resources: ["nodes", "pods", "namespaces"]
    verbs: ["get", "list", "watch"]

  # Only needed when using extra_metadata_labels or request/limit utilization metrics
  - apiGroups: [""]
    resources: ["nodes/pods"]
    verbs: ["get"]

  # Permission for k8sattributes processor metadata
  - apiGroups: ["apps"]
    resources: ["replicasets", "deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]

  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
---
# ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector-kubeletstats
subjects:
  - kind: ServiceAccount
    name: otel-collector-kubeletstats
    namespace: observability
roleRef:
  kind: ClusterRole
  name: otel-collector-kubeletstats
  apiGroup: rbac.authorization.k8s.io
```

The `nodes/stats` permission is critical. Without it, the Kubelet will reject requests from the collector.

## DaemonSet Deployment

Deploy as a DaemonSet to collect from all nodes:

```yaml
# DaemonSet configuration for per-node collection
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-kubeletstats
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector-kubeletstats
  template:
    metadata:
      labels:
        app: otel-collector-kubeletstats
    spec:
      serviceAccountName: otel-collector-kubeletstats
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.153.0
        args:
          - --config=/etc/otelcol/config.yaml
        env:
          # Downward API provides node name
          - name: K8S_NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
          - name: CLUSTER_NAME
            value: production-cluster
        resources:
          requests:
            memory: 128Mi
            cpu: 50m
          limits:
            memory: 256Mi
            cpu: 200m
        volumeMounts:
        - name: config
          mountPath: /etc/otelcol
      volumes:
      - name: config
        configMap:
          name: otel-collector-kubeletstats-config
```

The downward API injects the node name as an environment variable so each collector pod can query the Kubelet for the node it is running on.

## Filtering Namespaces

Exclude system namespaces to reduce metric volume:

```yaml
# Filter out system namespace metrics
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - pod
      - container

processors:
  filter:
    error_mode: ignore
    metrics:
      datapoint:
        - 'IsMatch(resource.attributes["k8s.namespace.name"], "^(kube-system|kube-public|kube-node-lease)$")'

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: https://backend.example.com:4317

service:
  pipelines:
    metrics:
      receivers: [kubelet_stats]
      processors: [filter, batch]
      exporters: [otlp]
```

This dramatically reduces metric cardinality by excluding metrics from system pods that are typically monitored through other means.

## Calculating CPU Utilization

CPU metrics need interpretation:

```yaml
# CPU metrics explained
# - k8s.pod.cpu.usage: Current CPU usage in cores (gauge)
# - k8s.pod.cpu.time: Actual CPU time used (cumulative counter)
# - k8s.pod.cpu_limit_utilization: Usage as a ratio of pod CPU limits (disabled by default)

# CPU utilization calculation:
# usage_cores = (current_cpu_time - previous_cpu_time) / time_elapsed

# With limits:
# utilization_vs_limit = usage_cores / limit_cores

# The receiver provides CPU usage metrics by default.
# Request and limit utilization metrics must be enabled explicitly.
```

CPU time is a cumulative counter (total CPU seconds consumed). The `k8s.pod.cpu.usage`, `k8s.node.cpu.usage`, and `container.cpu.usage` metrics are gauges that report CPU usage in cores averaged over the sample window. Request and limit utilization metrics, such as `k8s.pod.cpu_limit_utilization`, are available but disabled by default and require additional Kubelet RBAC.

## Memory Metrics Interpretation

Memory metrics have specific meanings:

```yaml
# Memory metric definitions

# k8s.pod.memory.usage
# Total memory allocated by containers
# Includes cache and buffers
# Not used for OOM decisions

# k8s.pod.memory.working_set
# Active memory used by processes
# Excludes inactive cache
# THIS is what Kubernetes uses for OOM decisions
# Alert on this metric, not usage

# k8s.pod.memory.rss
# Resident set size (anonymous memory)
# Actual RAM used by processes
# Does not include cache

# k8s.pod.memory.page_faults
# Major: Required disk I/O (slow)
# Minor: Resolved without I/O (fast)
# High major page faults indicate memory pressure
```

The `working_set` metric is critical. When a pod's working set exceeds its memory limit, Kubernetes kills it with an OOMKilled status.

## Network Metrics

Track network I/O per pod:

```yaml
# Network metrics show traffic patterns
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250
    insecure_skip_verify: true
    collection_interval: 30s
    metric_groups:
      - pod

# Example network metrics:
# - k8s.pod.network.io{direction="receive"}: Bytes received
# - k8s.pod.network.io{direction="transmit"}: Bytes transmitted
# - k8s.pod.network.errors{direction="receive"}: Receive errors
# - k8s.pod.network.errors{direction="transmit"}: Transmit errors

# Useful for:
# - Identifying chatty services
# - Detecting network issues
# - Capacity planning for network bandwidth
```

Network metrics help identify pods generating excessive traffic or experiencing network problems.

## Complete Production Configuration

Here's a production-ready configuration:

```yaml
# Production Kubelet Stats Receiver configuration
# Optimized for real-world Kubernetes monitoring
receivers:
  kubelet_stats:
    auth_type: serviceAccount
    endpoint: https://${env:K8S_NODE_NAME}:10250

    # Validate certificates in production
    insecure_skip_verify: false
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt

    collection_interval: 30s

    # Collect all metric groups for comprehensive visibility
    metric_groups:
      - node
      - pod
      - container
      - volume

processors:
  # Filter system namespaces
  filter:
    error_mode: ignore
    metrics:
      datapoint:
        - 'IsMatch(resource.attributes["k8s.namespace.name"], "^(kube-system|kube-public|kube-node-lease)$")'

  # Add Kubernetes metadata
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.statefulset.name
        - k8s.daemonset.name
        - k8s.pod.name
        - k8s.node.name
      labels:
        - tag_name: app
          key: app
          from: pod
        - tag_name: version
          key: version
          from: pod
        - tag_name: team
          key: team
          from: pod

  # Add cluster context
  resource:
    attributes:
      - key: k8s.cluster.name
        value: ${CLUSTER_NAME}
        action: insert

      - key: deployment.environment
        value: ${ENVIRONMENT}
        action: insert

  # Batch for efficiency
  batch:
    timeout: 10s
    send_batch_size: 2048

  # Memory protection
  memory_limiter:
    check_interval: 1s
    limit_mib: 256

exporters:
  otlp:
    endpoint: ${OTLP_ENDPOINT}
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    metrics:
      receivers: [kubelet_stats]
      processors: [memory_limiter, filter, k8sattributes, resource, batch]
      exporters: [otlp]

  # Collector self-monitoring
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
```

## Key Metrics for Alerting

Set up alerts on these critical metrics:

```yaml
# Critical alerts based on Kubelet Stats metrics

# Pod memory near limit
# k8s.pod.memory_limit_utilization > 0.9
# Alert when pod uses >90% of memory limit (requires enabling this optional metric)

# High pod CPU usage
# k8s.pod.cpu.usage > expected_baseline
# Alert when pod CPU usage exceeds an application-specific threshold

# Pod network errors
# rate(k8s.pod.network.errors[5m]) > 10
# Alert on sustained network errors

# Volume near capacity
# k8s.volume.available / k8s.volume.capacity < 0.1
# Alert when volume <10% free space

# Node filesystem pressure
# k8s.node.filesystem.available / k8s.node.filesystem.capacity < 0.1
# Alert when node filesystem <10% free
```

## Troubleshooting

### No Metrics Appearing

Check these issues:

1. Verify RBAC permissions: `kubectl auth can-i get nodes/stats --as=system:serviceaccount:observability:otel-collector-kubeletstats`
2. Check Kubelet endpoint accessibility from pod
3. Verify `K8S_NODE_NAME` environment variable is set correctly
4. Review collector logs for authentication errors
5. Ensure DaemonSet is running on all nodes

### Certificate Validation Errors

If you see TLS certificate errors:

```yaml
# Temporary fix for development
receivers:
  kubelet_stats:
    insecure_skip_verify: true

# Production fix
receivers:
  kubelet_stats:
    insecure_skip_verify: false
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
```

### High Cardinality Issues

If metric cardinality is too high:

1. Filter out system namespaces
2. Exclude container metrics (use only pod-level)
3. Reduce label extraction in k8sattributes processor
4. Increase collection interval

### Missing Node Metrics

If node-level metrics are missing:

1. Verify `node` is in `metric_groups`
2. Check Kubelet `/stats/summary` endpoint is accessible
3. Verify Kubelet is running on the node
4. Check Kubelet configuration allows stats endpoint access

## Use Cases

Resource Optimization

Kubelet Stats helps rightsize containers:

- Compare actual CPU/memory usage against requests/limits
- Identify over-provisioned pods wasting resources
- Detect under-provisioned pods getting throttled or OOMKilled

### Capacity Planning

Track resource trends over time:

- CPU and memory usage patterns by application
- Volume growth rates for capacity forecasting
- Network bandwidth consumption

### Performance Troubleshooting

Diagnose performance issues:

- High CPU usage or throttling
- Memory pressure and OOMKills
- Network errors or high latency
- Disk I/O bottlenecks

## Next Steps

The Kubelet Stats Receiver provides pod and container resource metrics. For complete Kubernetes observability:

1. Use the [OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view) in gateway mode for centralized aggregation
2. Monitor [collector internal metrics](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view) to ensure reliability
3. Combine with Kubernetes Cluster Receiver for cluster-level metrics
4. Add Kubernetes Events Receiver for event correlation
5. Deploy Prometheus-compatible dashboards to visualize metrics

The Kubelet Stats Receiver provides the foundation for Kubernetes resource monitoring. By collecting actual resource consumption data, you gain visibility into how your applications really behave in production, enabling data-driven decisions about resource allocation and capacity planning.
