# How to Monitor Probe Failures with Prometheus and Kubernetes Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, Health Probes, Monitoring, Observability

Description: Learn how to effectively monitor Kubernetes probe failures using Prometheus metrics and event tracking, enabling proactive detection and response to application health issues before they impact users.

---

Health probe failures are early warning signals that something is wrong with your application. Monitoring these failures effectively helps you detect issues before they cascade into major outages. Combining Prometheus metrics with Kubernetes event tracking gives you comprehensive visibility into probe health.

Without proper monitoring, probe failures can go unnoticed until users report problems. By the time you investigate, the pod may have already restarted multiple times, destroying valuable debugging context.

## Understanding Probe Failure Metrics

Kubernetes exposes probe failures through multiple channels. The kubelet records probe results and emits events when probes fail. These events feed into kube-state-metrics, which exports Prometheus-compatible metrics about probe status.

Key metrics to track include probe success rate, failure count, and restart counts triggered by liveness failures. Correlation between these metrics reveals patterns that indicate underlying problems.

## Setting Up Kube-State-Metrics

First, ensure kube-state-metrics is deployed in your cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-state-metrics
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kube-state-metrics
  template:
    metadata:
      labels:
        app: kube-state-metrics
    spec:
      serviceAccountName: kube-state-metrics
      containers:
      - name: kube-state-metrics
        image: registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.10.1
        ports:
        - containerPort: 8080
          name: http-metrics
        - containerPort: 8081
          name: telemetry
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-state-metrics
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics
rules:
- apiGroups: [""]
  resources:
  - configmaps
  - secrets
  - nodes
  - pods
  - services
  - resourcequotas
  - replicationcontrollers
  - limitranges
  - persistentvolumeclaims
  - persistentvolumes
  - namespaces
  - endpoints
  verbs: ["list", "watch"]
- apiGroups: ["apps"]
  resources:
  - statefulsets
  - daemonsets
  - deployments
  - replicasets
  verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-state-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-state-metrics
subjects:
- kind: ServiceAccount
  name: kube-state-metrics
  namespace: kube-system
---
apiVersion: v1
kind: Service
metadata:
  name: kube-state-metrics
  namespace: kube-system
  labels:
    app: kube-state-metrics
  annotations:
    prometheus.io/scrape: "true"
spec:
  ports:
  - name: http-metrics
    port: 8080
    targetPort: http-metrics
  - name: telemetry
    port: 8081
    targetPort: telemetry
  selector:
    app: kube-state-metrics
```

## Configuring Prometheus to Scrape Pod Metrics

Configure Prometheus to collect pod health metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
    - job_name: 'kube-state-metrics'
      static_configs:
      - targets: ['kube-state-metrics.kube-system:8080']

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
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
```

## Creating Probe Failure Alerts

Define Prometheus alerts for various probe failure scenarios:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: probe-failure-alerts
  namespace: monitoring
spec:
  groups:
  - name: probe_failures
    interval: 30s
    rules:
    # Alert on readiness probe failures
    - alert: PodReadinessProbeFailure
      expr: |
        kube_pod_status_ready{condition="false"} == 1
      for: 5m
      labels:
        severity: warning
        component: health-check
      annotations:
        summary: "Pod readiness probe failing"
        description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} has been not ready for 5 minutes"

    # Alert on liveness probe failures leading to restarts
    - alert: PodLivenessProbeFailure
      expr: |
        rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 5m
      labels:
        severity: critical
        component: health-check
      annotations:
        summary: "Pod restarting due to liveness probe failures"
        description: "Container {{ $labels.container }} in pod {{ $labels.namespace }}/{{ $labels.pod }} is restarting"

    # Alert on high restart rate
    - alert: HighPodRestartRate
      expr: |
        rate(kube_pod_container_status_restarts_total[1h]) > 0.1
      for: 10m
      labels:
        severity: critical
        component: health-check
      annotations:
        summary: "Pod restarting frequently"
        description: "Container {{ $labels.container }} in {{ $labels.namespace }}/{{ $labels.pod }} restarting frequently ({{ $value }} restarts/sec)"

    # Alert when many pods in deployment are not ready
    - alert: DeploymentPodsNotReady
      expr: |
        (
          kube_deployment_status_replicas_available
          /
          kube_deployment_spec_replicas
        ) < 0.5
      for: 10m
      labels:
        severity: critical
        component: health-check
      annotations:
        summary: "Less than 50% of deployment pods ready"
        description: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} has less than 50% pods ready"

    # Alert on startup probe timeout
    - alert: PodStartupProbeTimeout
      expr: |
        kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1
      for: 5m
      labels:
        severity: warning
        component: health-check
      annotations:
        summary: "Pod in CrashLoopBackOff"
        description: "Container {{ $labels.container }} in {{ $labels.namespace }}/{{ $labels.pod }} is in CrashLoopBackOff"

    # Alert when probe duration is high
    - alert: ProbeSlowResponse
      expr: |
        histogram_quantile(0.99,
          rate(probe_duration_seconds_bucket[5m])
        ) > 5
      for: 10m
      labels:
        severity: warning
        component: health-check
      annotations:
        summary: "Health probe responding slowly"
        description: "99th percentile probe duration is {{ $value }}s for {{ $labels.pod }}"

    # Alert on container image pull failures
    - alert: ImagePullFailure
      expr: |
        kube_pod_container_status_waiting_reason{reason=~"ImagePullBackOff|ErrImagePull"} == 1
      for: 5m
      labels:
        severity: warning
        component: health-check
      annotations:
        summary: "Cannot pull container image"
        description: "Container {{ $labels.container }} in {{ $labels.namespace }}/{{ $labels.pod }} cannot pull image"

    # Alert when no pods are ready in a service
    - alert: ServiceHasNoEndpoints
      expr: |
        sum by (namespace, service) (kube_endpoint_address_available) == 0
      for: 5m
      labels:
        severity: critical
        component: health-check
      annotations:
        summary: "Service has no available endpoints"
        description: "Service {{ $labels.namespace }}/{{ $labels.service }} has no ready pods"
```

## Instrumenting Application Health Checks

Add custom metrics to your application health checks:

```python
# app_health.py
from prometheus_client import Counter, Histogram, Gauge
import time
import functools

# Metrics for health checks
health_check_duration = Histogram(
    'app_health_check_duration_seconds',
    'Duration of health check',
    ['check_type', 'endpoint']
)

health_check_total = Counter(
    'app_health_check_total',
    'Total health checks performed',
    ['check_type', 'endpoint', 'status']
)

health_status = Gauge(
    'app_health_status',
    'Current health status (1=healthy, 0=unhealthy)',
    ['check_type', 'dependency']
)

def monitor_health_check(check_type, endpoint):
    """Decorator to monitor health check execution"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                status = 'success' if result else 'failure'
                health_check_total.labels(
                    check_type=check_type,
                    endpoint=endpoint,
                    status=status
                ).inc()
                return result
            except Exception as e:
                health_check_total.labels(
                    check_type=check_type,
                    endpoint=endpoint,
                    status='error'
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                health_check_duration.labels(
                    check_type=check_type,
                    endpoint=endpoint
                ).observe(duration)
        return wrapper
    return decorator

class HealthMonitor:
    def __init__(self):
        self.dependencies = {}

    @monitor_health_check('liveness', '/healthz/live')
    def check_liveness(self):
        """Liveness check with monitoring"""
        # Perform liveness check
        healthy = self._check_process_health()
        health_status.labels(
            check_type='liveness',
            dependency='process'
        ).set(1 if healthy else 0)
        return healthy

    @monitor_health_check('readiness', '/healthz/ready')
    def check_readiness(self):
        """Readiness check with monitoring"""
        # Check all dependencies
        all_healthy = True
        for dep_name, checker in self.dependencies.items():
            healthy = checker()
            health_status.labels(
                check_type='readiness',
                dependency=dep_name
            ).set(1 if healthy else 0)
            if not healthy:
                all_healthy = False
        return all_healthy

    def _check_process_health(self):
        # Implementation of process health check
        return True

    def register_dependency(self, name, checker):
        """Register a dependency check"""
        self.dependencies[name] = checker
```

## Kubernetes Event Monitoring

Monitor Kubernetes events related to probe failures:

```go
// event_monitor.go
package main

import (
    "context"
    "fmt"
    "log"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/watch"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    probeFailureEvents = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "kubernetes_probe_failure_events_total",
            Help: "Total Kubernetes events for probe failures",
        },
        []string{"namespace", "pod", "container", "reason"},
    )

    unhealthyEvents = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "kubernetes_unhealthy_events_total",
            Help: "Total Kubernetes unhealthy events",
        },
        []string{"namespace", "pod", "reason"},
    )
)

func monitorEvents(ctx context.Context) error {
    config, err := rest.InClusterConfig()
    if err != nil {
        return err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return err
    }

    watcher, err := clientset.CoreV1().Events("").Watch(ctx, metav1.ListOptions{})
    if err != nil {
        return err
    }
    defer watcher.Stop()

    log.Println("Started monitoring Kubernetes events")

    for {
        select {
        case <-ctx.Done():
            return nil
        case event := <-watcher.ResultChan():
            if event.Object == nil {
                continue
            }

            kubeEvent, ok := event.Object.(*corev1.Event)
            if !ok {
                continue
            }

            handleEvent(kubeEvent)
        }
    }
}

func handleEvent(event *corev1.Event) {
    // Track probe-related events
    switch event.Reason {
    case "Unhealthy":
        // Probe failure event
        probeFailureEvents.WithLabelValues(
            event.InvolvedObject.Namespace,
            event.InvolvedObject.Name,
            event.InvolvedObject.FieldPath,
            event.Reason,
        ).Inc()

        log.Printf("Probe failure: %s/%s - %s",
            event.InvolvedObject.Namespace,
            event.InvolvedObject.Name,
            event.Message)

    case "BackOff":
        unhealthyEvents.WithLabelValues(
            event.InvolvedObject.Namespace,
            event.InvolvedObject.Name,
            event.Reason,
        ).Inc()

        log.Printf("BackOff: %s/%s - %s",
            event.InvolvedObject.Namespace,
            event.InvolvedObject.Name,
            event.Message)
    }
}
```

## Dashboard Configuration

Create a Grafana dashboard for probe monitoring:

```json
{
  "dashboard": {
    "title": "Kubernetes Health Probe Monitoring",
    "panels": [
      {
        "title": "Pod Readiness Status",
        "targets": [
          {
            "expr": "sum by (namespace, pod) (kube_pod_status_ready{condition=\"false\"})"
          }
        ]
      },
      {
        "title": "Container Restart Rate",
        "targets": [
          {
            "expr": "rate(kube_pod_container_status_restarts_total[5m])"
          }
        ]
      },
      {
        "title": "Probe Failure Events",
        "targets": [
          {
            "expr": "rate(kubernetes_probe_failure_events_total[5m])"
          }
        ]
      },
      {
        "title": "Health Check Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(app_health_check_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

Monitoring probe failures with Prometheus and Kubernetes events provides comprehensive visibility into application health. By combining metrics, events, and alerts, you can detect and respond to issues proactively, maintaining high availability and reliability for your Kubernetes workloads.
