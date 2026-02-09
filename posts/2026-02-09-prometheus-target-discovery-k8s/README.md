# How to Configure Prometheus Target Discovery with Kubernetes Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Service Discovery

Description: Configure Prometheus to automatically discover and scrape metrics from Kubernetes pods, services, and nodes using native service discovery mechanisms with relabeling and filtering.

---

Prometheus includes powerful service discovery mechanisms that automatically find scrape targets in dynamic environments like Kubernetes. Instead of manually maintaining static target lists, Prometheus can discover pods, services, nodes, and endpoints through the Kubernetes API.

This guide shows you how to configure each discovery mechanism, apply relabeling rules to filter and enrich targets, and optimize discovery for production environments.

## Understanding Kubernetes Service Discovery Roles

Prometheus supports five Kubernetes service discovery roles:

- **node**: Discovers one target per cluster node with node information
- **service**: Discovers services and creates targets for each service port
- **pod**: Discovers pods and creates targets for each container port
- **endpoints**: Discovers endpoints behind services
- **endpointslice**: Discovers endpoint slices (more scalable than endpoints)

Each role exposes different metadata labels that you can use for relabeling and filtering.

## Configuring Pod Discovery

Discover and scrape metrics directly from pods:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - default
            - production
            - staging

    relabel_configs:
      # Only scrape pods with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Use custom port from annotation or default to port in pod spec
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port, __meta_kubernetes_pod_container_port_number]
        action: replace
        regex: ([^;]+)(?:;.*)?
        target_label: __address__
        replacement: ${1}

      # Use custom metrics path from annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace

      # Add pod name label
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: kubernetes_pod_name

      # Add pod labels as prometheus labels
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
```

Annotate your pods to enable scraping:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
  labels:
    app: my-app
    version: v1.0.0
spec:
  containers:
  - name: app
    image: my-app:latest
    ports:
    - containerPort: 8080
      name: metrics
```

## Configuring Service Discovery

Discover services and scrape through service endpoints:

```yaml
scrape_configs:
  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
      - role: service

    metrics_path: /metrics

    relabel_configs:
      # Only scrape services with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Use service annotation for metrics path
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Use service annotation for port
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

      # Add service name
      - source_labels: [__meta_kubernetes_service_name]
        target_label: kubernetes_service_name

      # Add namespace
      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace
```

Annotate services for discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```

## Configuring Node Discovery

Discover cluster nodes and scrape node-level metrics:

```yaml
scrape_configs:
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node

    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      insecure_skip_verify: false

    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

    relabel_configs:
      # Map node internal IP to target address
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

      # Add node name
      - source_labels: [__meta_kubernetes_node_name]
        target_label: kubernetes_node

      # Scrape kubelet metrics endpoint
      - target_label: __address__
        replacement: kubernetes.default.svc:443

      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics
```

This configuration scrapes kubelet metrics from each node through the Kubernetes API server.

## Configuring Endpoints Discovery

Discover endpoints behind services for more granular scraping:

```yaml
scrape_configs:
  - job_name: 'kubernetes-endpoints'
    kubernetes_sd_configs:
      - role: endpoints

    relabel_configs:
      # Only scrape endpoints of services with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Drop endpoints that are not ready
      - source_labels: [__meta_kubernetes_endpoint_ready]
        action: keep
        regex: true

      # Custom metrics path from service annotation
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Custom port from service annotation
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

      # Add endpoint metadata
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)

      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace

      - source_labels: [__meta_kubernetes_service_name]
        target_label: kubernetes_service_name

      - source_labels: [__meta_kubernetes_pod_name]
        target_label: kubernetes_pod_name
```

## Using EndpointSlices for Scalability

For large clusters, use endpointslice role instead of endpoints:

```yaml
scrape_configs:
  - job_name: 'kubernetes-endpointslices'
    kubernetes_sd_configs:
      - role: endpointslice

    relabel_configs:
      # Filter by service annotation
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Only scrape ready endpoints
      - source_labels: [__meta_kubernetes_endpointslice_endpoint_conditions_ready]
        action: keep
        regex: true

      # Add labels
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

      - source_labels: [__meta_kubernetes_service_name]
        target_label: service

      - source_labels: [__meta_kubernetes_endpointslice_name]
        target_label: endpointslice
```

EndpointSlices scale better than Endpoints in clusters with many pod replicas.

## Advanced Relabeling Patterns

Filter targets based on complex criteria:

```yaml
relabel_configs:
  # Only scrape pods in specific namespaces
  - source_labels: [__meta_kubernetes_namespace]
    action: keep
    regex: (production|staging)

  # Skip pods with no-monitor label
  - source_labels: [__meta_kubernetes_pod_label_no_monitor]
    action: drop
    regex: "true"

  # Only scrape pods with specific app label values
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: (api|worker|scheduler)

  # Extract version from image tag
  - source_labels: [__meta_kubernetes_pod_container_image]
    regex: ".*:([^:]+)"
    target_label: version

  # Rename labels
  - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
    target_label: app

  - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
    target_label: component
```

## Discovering Targets Across Multiple Clusters

Monitor multiple Kubernetes clusters from a central Prometheus:

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods-cluster-1'
    kubernetes_sd_configs:
      - role: pod
        api_server: https://cluster1.example.com:6443
        tls_config:
          ca_file: /etc/prometheus/cluster1-ca.crt
        bearer_token_file: /etc/prometheus/cluster1-token

    relabel_configs:
      - target_label: cluster
        replacement: cluster-1
      # ... other relabel configs

  - job_name: 'kubernetes-pods-cluster-2'
    kubernetes_sd_configs:
      - role: pod
        api_server: https://cluster2.example.com:6443
        tls_config:
          ca_file: /etc/prometheus/cluster2-ca.crt
        bearer_token_file: /etc/prometheus/cluster2-token

    relabel_configs:
      - target_label: cluster
        replacement: cluster-2
      # ... other relabel configs
```

## Optimizing Discovery Performance

Reduce API server load with namespaces filtering:

```yaml
kubernetes_sd_configs:
  - role: pod
    # Only discover in specific namespaces
    namespaces:
      names:
        - production
        - staging
        - monitoring

    # Or exclude system namespaces
    # namespaces:
    #   own_namespace: false

# Adjust discovery refresh interval (default 5m)
scrape_configs:
  - job_name: 'kubernetes-pods'
    scrape_interval: 30s
    kubernetes_sd_configs:
      - role: pod
        # Discovery happens at scrape_interval
```

## Debugging Service Discovery

Check discovered targets in the Prometheus UI:

```
# View all discovered targets
http://prometheus:9090/targets

# View service discovery state
http://prometheus:9090/service-discovery

# Query target metadata
up{job="kubernetes-pods"}
```

Enable debug logging in Prometheus:

```yaml
# prometheus.yml
global:
  log_level: debug

# Or start with flag
--log.level=debug
```

Check logs for discovery issues:

```bash
kubectl logs -n monitoring prometheus-0 | grep -i "kubernetes"
```

## Complete Production Configuration

Here's a comprehensive Prometheus configuration with all discovery roles:

```yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  # Discover pods
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

  # Discover services
  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
      - role: service
    metrics_path: /probe
    params:
      module: [http_2xx]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_probe]
        action: keep
        regex: true
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: blackbox-exporter:9115
      - source_labels: [__param_target]
        target_label: instance
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)

  # Discover nodes
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
```

## Conclusion

Kubernetes service discovery in Prometheus eliminates manual target configuration and automatically adapts to cluster changes. By combining the right discovery role with proper relabeling rules, you can build flexible monitoring that scales with your infrastructure.

Start with pod discovery for application metrics, add node discovery for infrastructure metrics, and use service or endpoint discovery when you need to scrape through service abstractions. Always filter discovered targets with relabeling to keep cardinality manageable and focus on the metrics that matter.
