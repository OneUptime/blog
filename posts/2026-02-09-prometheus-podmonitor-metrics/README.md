# How to Implement Prometheus PodMonitor for Pod-Level Metrics Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, PodMonitor, Monitoring, Observability

Description: Learn how to use Prometheus PodMonitor CRD to collect metrics directly from pods without requiring Kubernetes services.

---

While ServiceMonitors work well for services, some scenarios require monitoring pods directly. Stateful applications, DaemonSets, or pods that do not expose services benefit from PodMonitor. This Custom Resource Definition allows Prometheus to scrape metrics directly from pods based on label selectors, providing more granular control over metrics collection.

## When to Use PodMonitor vs ServiceMonitor

Choose PodMonitor when:
- Monitoring pods without services (DaemonSets, StatefulSets)
- Each pod exposes unique metrics (node exporters, per-pod metrics)
- You need per-replica metrics instead of aggregated service metrics
- Monitoring ephemeral jobs or batch workloads
- Collecting metrics from init containers or sidecar containers

Use ServiceMonitor when:
- Monitoring standard application services
- Aggregating metrics across multiple pods
- Following Kubernetes service patterns
- Monitoring external services via Service definitions

## Basic PodMonitor Configuration

Here's a simple PodMonitor that scrapes metrics from application pods:

```yaml
# basic-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: app-pod-monitor
  namespace: production
  labels:
    release: prometheus-stack  # Must match Prometheus podMonitorSelector
spec:
  # Select pods with matching labels
  selector:
    matchLabels:
      app: my-application
      monitoring: enabled

  # Define which ports to scrape
  podMetricsEndpoints:
    - port: metrics  # Named port from pod spec
      interval: 30s
      path: /metrics
```

The corresponding pod must have matching labels and expose the metrics port:

```yaml
# application-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-application
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-application
  template:
    metadata:
      labels:
        app: my-application      # Matches PodMonitor selector
        monitoring: enabled       # Matches PodMonitor selector
    spec:
      containers:
        - name: app
          image: my-app:v1.0
          ports:
            - name: metrics       # Named port referenced by PodMonitor
              containerPort: 8080
            - name: http
              containerPort: 80
```

Apply the configuration:

```bash
# Apply the deployment
kubectl apply -f application-deployment.yaml

# Apply the PodMonitor
kubectl apply -f basic-podmonitor.yaml
```

## Monitoring DaemonSets with PodMonitor

DaemonSets run one pod per node and are ideal candidates for PodMonitor. Here's an example monitoring node exporters:

```yaml
# node-exporter-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  # Select node exporter pods
  selector:
    matchLabels:
      app.kubernetes.io/name: node-exporter

  # Scrape configuration
  podMetricsEndpoints:
    - port: metrics
      interval: 30s
      path: /metrics

      # Add node information to metrics
      relabelings:
        # Add node name as a label
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          targetLabel: node
          action: replace

        # Add pod IP
        - sourceLabels: [__meta_kubernetes_pod_ip]
          targetLabel: pod_ip
          action: replace
```

## Monitoring StatefulSet Pods

StatefulSets maintain stable network identities for each pod, making per-pod metrics valuable:

```yaml
# statefulset-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: database-monitor
  namespace: production
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: postgresql
      statefulset: db-cluster

  podMetricsEndpoints:
    - port: metrics
      interval: 15s
      path: /metrics

      # Preserve pod-specific labels
      relabelings:
        # Keep the StatefulSet pod ordinal
        - sourceLabels: [__meta_kubernetes_pod_name]
          regex: '.*-([0-9]+)$'
          targetLabel: pod_ordinal
          action: replace

        # Add StatefulSet name
        - sourceLabels: [__meta_kubernetes_pod_controller_name]
          targetLabel: statefulset
          action: replace
```

## Advanced PodMonitor Features

### Multiple Container Ports

Monitor multiple ports from different containers in the same pod:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: multi-container-monitor
  namespace: production
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: multi-container-app

  podMetricsEndpoints:
    # Main application container
    - port: app-metrics
      interval: 30s
      path: /metrics

    # Sidecar proxy metrics
    - port: proxy-metrics
      interval: 30s
      path: /stats/prometheus

    # Security sidecar metrics
    - port: security-metrics
      interval: 60s
      path: /security/metrics
```

### Filtering with Metric Relabeling

Drop unwanted metrics or transform labels:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: filtered-pod-monitor
  namespace: production
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: high-cardinality-app

  podMetricsEndpoints:
    - port: metrics
      interval: 30s
      path: /metrics

      # Filter and transform metrics
      metricRelabelings:
        # Drop debug metrics
        - sourceLabels: [__name__]
          regex: 'debug_.*'
          action: drop

        # Drop high-cardinality labels
        - regex: 'user_id|session_id|request_id'
          action: labeldrop

        # Keep only important metrics
        - sourceLabels: [__name__]
          regex: '(http_requests_total|http_request_duration_seconds|process_.*)'
          action: keep

        # Normalize label values
        - sourceLabels: [status_code]
          regex: '([0-9])..'
          targetLabel: status_class
          replacement: '${1}xx'
          action: replace
```

### Authentication and TLS

Scrape secured endpoints:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: secured-pod-monitor
  namespace: production
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: secured-app

  podMetricsEndpoints:
    - port: metrics-https
      interval: 30s
      path: /metrics
      scheme: https

      # TLS configuration
      tlsConfig:
        insecureSkipVerify: false
        ca:
          secret:
            name: metrics-ca
            key: ca.crt

      # Basic authentication
      basicAuth:
        username:
          name: pod-metrics-auth
          key: username
        password:
          name: pod-metrics-auth
          key: password
```

## Advanced Label Relabeling

PodMonitor provides access to pod metadata through meta labels:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: metadata-enriched-monitor
  namespace: production
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: my-app

  podMetricsEndpoints:
    - port: metrics
      interval: 30s

      relabelings:
        # Add pod namespace
        - sourceLabels: [__meta_kubernetes_namespace]
          targetLabel: namespace
          action: replace

        # Add pod name
        - sourceLabels: [__meta_kubernetes_pod_name]
          targetLabel: pod
          action: replace

        # Add node name
        - sourceLabels: [__meta_kubernetes_pod_node_name]
          targetLabel: node
          action: replace

        # Add container name
        - sourceLabels: [__meta_kubernetes_pod_container_name]
          targetLabel: container
          action: replace

        # Add pod phase (Running, Pending, etc.)
        - sourceLabels: [__meta_kubernetes_pod_phase]
          targetLabel: phase
          action: replace

        # Extract environment from pod labels
        - sourceLabels: [__meta_kubernetes_pod_label_environment]
          targetLabel: environment
          action: replace

        # Add owner information
        - sourceLabels: [__meta_kubernetes_pod_controller_kind]
          targetLabel: owner_kind
          action: replace

        - sourceLabels: [__meta_kubernetes_pod_controller_name]
          targetLabel: owner_name
          action: replace
```

## Monitoring Across Namespaces

Monitor pods in multiple namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: cross-namespace-monitor
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  # Select specific namespaces
  namespaceSelector:
    matchNames:
      - production
      - staging
      - development

  # Or use label-based selection
  # namespaceSelector:
  #   matchLabels:
  #     monitoring: enabled

  selector:
    matchLabels:
      expose-metrics: "true"

  podMetricsEndpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Scrape Configuration Options

Configure timeouts, parameters, and behavior:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: custom-scrape-monitor
  namespace: production
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: custom-app

  podMetricsEndpoints:
    - port: metrics
      interval: 30s
      scrapeTimeout: 10s  # Must be less than interval

      # Add query parameters
      params:
        format:
          - prometheus
        include:
          - runtime
          - custom

      # Honor labels from target (override Prometheus labels)
      honorLabels: true

      # Honor timestamps from target
      honorTimestamps: true

      # Follow HTTP redirects
      followRedirects: true
```

## Monitoring Job Pods

Monitor batch jobs and CronJobs:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: job-monitor
  namespace: batch
  labels:
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      job-type: batch-processing

  podMetricsEndpoints:
    - port: metrics
      interval: 10s  # More frequent for short-lived jobs
      path: /metrics

      relabelings:
        # Add job name
        - sourceLabels: [__meta_kubernetes_pod_label_job_name]
          targetLabel: job_name
          action: replace

        # Add batch ID
        - sourceLabels: [__meta_kubernetes_pod_label_batch_id]
          targetLabel: batch_id
          action: replace

        # Timestamp for job completion metrics
        - sourceLabels: [__meta_kubernetes_pod_label_completion_time]
          targetLabel: completion_time
          action: replace
```

## Verifying PodMonitor Configuration

Check if the PodMonitor was created successfully:

```bash
# List all PodMonitors
kubectl get podmonitor -A

# Get detailed information
kubectl describe podmonitor app-pod-monitor -n production

# Check labels
kubectl get podmonitor app-pod-monitor -n production -o jsonpath='{.metadata.labels}'
```

Verify that Prometheus discovered the pods:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &

# Check targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job | contains("app-pod-monitor"))'
```

Check which pods match the selector:

```bash
# Get matching pods
kubectl get pods -n production -l app=my-application,monitoring=enabled

# Check if pods have the metrics port
kubectl get pods -n production -l app=my-application -o jsonpath='{.items[*].spec.containers[*].ports[?(@.name=="metrics")]}'
```

## Troubleshooting PodMonitor Issues

### PodMonitor Not Discovered

Verify the PodMonitor has the correct label for Prometheus:

```bash
kubectl get podmonitor app-pod-monitor -n production -o jsonpath='{.metadata.labels.release}'
```

Check Prometheus pod monitor selector:

```bash
kubectl get prometheus -n monitoring -o yaml | grep -A 5 podMonitorSelector
```

### No Targets Found

Verify pods have matching labels:

```bash
kubectl get pods -n production --show-labels | grep my-application
```

Check if pods are running and ready:

```bash
kubectl get pods -n production -l app=my-application
```

### Scrape Failures

Test the metrics endpoint from within the cluster:

```bash
# Create a debug pod
kubectl run debug --image=curlimages/curl -it --rm -- sh

# From inside the pod, test the metrics endpoint
curl http://<pod-ip>:8080/metrics
```

Check Prometheus logs for errors:

```bash
PROM_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n monitoring $PROM_POD | grep -i "error.*scrape"
```

## Best Practices

1. Use PodMonitor for pod-specific metrics, ServiceMonitor for service-level aggregation
2. Apply consistent labeling across pods and PodMonitors
3. Use metric relabeling to reduce cardinality
4. Set appropriate scrape intervals based on pod lifecycle
5. Add pod metadata through relabeling for better metric context
6. Monitor resource usage as you add more scraped pods
7. Test PodMonitors with a small subset before scaling
8. Document custom metrics in pod annotations

## Conclusion

PodMonitor provides fine-grained control over metrics collection at the pod level. When services do not adequately represent your monitoring needs, PodMonitor fills the gap by allowing direct pod selection and scraping. Combined with powerful relabeling capabilities, PodMonitor enables sophisticated monitoring strategies for StatefulSets, DaemonSets, batch jobs, and any pod-centric workload in Kubernetes.
