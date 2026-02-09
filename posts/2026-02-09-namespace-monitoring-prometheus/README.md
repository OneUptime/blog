# How to Configure Namespace Monitoring with Separate Prometheus Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Prometheus

Description: Learn how to deploy separate Prometheus instances per namespace for isolated monitoring, improved multi-tenancy, and fine-grained metrics collection in Kubernetes.

---

Running a single centralized Prometheus instance works well for small clusters, but multi-tenant environments often require isolated monitoring per namespace. Separate Prometheus instances provide namespace-level isolation, independent retention policies, custom scrape configurations per tenant, and isolated query performance without noisy neighbors.

This approach is essential when different teams need different monitoring configurations, when compliance requires data isolation, or when you want to prevent one namespace's metrics from impacting others.

## Architecture Overview

Each namespace gets its own Prometheus instance that only scrapes resources within that namespace. A central federation layer can aggregate metrics from all namespace Prometheus instances for cluster-wide visibility while maintaining isolation.

## Deploying Prometheus Per Namespace

Create a Prometheus deployment for a specific namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: team-alpha
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prometheus
  namespace: team-alpha
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/metrics
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources:
  - configmaps
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prometheus
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: team-alpha
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: team-alpha
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        namespace: 'team-alpha'
        cluster: 'production'

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - team-alpha
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

    - job_name: 'kubernetes-services'
      kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
          - team-alpha
      metrics_path: /metrics
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: kubernetes_name
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: team-alpha
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--storage.tsdb.retention.time=30d'
        - '--web.enable-lifecycle'
        ports:
        - containerPort: 9090
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-storage
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-storage
  namespace: team-alpha
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: team-alpha
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
    name: http
```

## Using Prometheus Operator for Multi-Namespace Monitoring

Deploy Prometheus using the Prometheus Operator for easier management:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-beta
---
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: team-prometheus
  namespace: team-beta
spec:
  replicas: 1
  serviceAccountName: prometheus
  serviceMonitorNamespaceSelector:
    matchLabels:
      name: team-beta
  podMonitorNamespaceSelector:
    matchLabels:
      name: team-beta
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m
  retention: 30d
  storage:
    volumeClaimTemplate:
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 50Gi
  externalLabels:
    namespace: team-beta
    cluster: production
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-metrics
  namespace: team-beta
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: metrics
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: pod-metrics
  namespace: team-beta
spec:
  selector:
    matchLabels:
      monitor: "true"
  podMetricsEndpoints:
  - port: metrics
    interval: 30s
```

## Implementing Federation for Central Monitoring

Create a central Prometheus that federates from namespace Prometheus instances:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-federation-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s

    scrape_configs:
    - job_name: 'federate-team-alpha'
      scrape_interval: 30s
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
        - '{job=~".+"}'
      static_configs:
      - targets:
        - 'prometheus.team-alpha.svc.cluster.local:9090'
        labels:
          federated_namespace: 'team-alpha'

    - job_name: 'federate-team-beta'
      scrape_interval: 30s
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
        - '{job=~".+"}'
      static_configs:
      - targets:
        - 'team-prometheus.team-beta.svc.cluster.local:9090'
        labels:
          federated_namespace: 'team-beta'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-federation
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus-federation
  template:
    metadata:
      labels:
        app: prometheus-federation
    spec:
      serviceAccountName: prometheus-federation
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--storage.tsdb.retention.time=90d'
        - '--web.enable-lifecycle'
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
      volumes:
      - name: config
        configMap:
          name: prometheus-federation-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-federation-storage
```

## Automating Prometheus Deployment Per Namespace

Create a controller to automatically deploy Prometheus for new namespaces:

```go
package main

import (
    "context"
    "fmt"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
)

type PrometheusDeployer struct {
    clientset     *kubernetes.Clientset
    dynamicClient dynamic.Interface
}

func NewPrometheusDeployer() (*PrometheusDeployer, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    dynamicClient, err := dynamic.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &PrometheusDeployer{
        clientset:     clientset,
        dynamicClient: dynamicClient,
    }, nil
}

func (pd *PrometheusDeployer) DeployPrometheus(ctx context.Context, namespace string) error {
    // Check if namespace needs monitoring
    ns, err := pd.clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
    if err != nil {
        return err
    }

    if ns.Labels["monitoring-enabled"] != "true" {
        return nil
    }

    // Create Prometheus resource using Operator
    prometheusResource := schema.GroupVersionResource{
        Group:    "monitoring.coreos.com",
        Version:  "v1",
        Resource: "prometheuses",
    }

    prometheus := &unstructured.Unstructured{
        Object: map[string]interface{}{
            "apiVersion": "monitoring.coreos.com/v1",
            "kind":       "Prometheus",
            "metadata": map[string]interface{}{
                "name":      "namespace-prometheus",
                "namespace": namespace,
            },
            "spec": map[string]interface{}{
                "replicas":            1,
                "serviceAccountName":  "prometheus",
                "retention":           "30d",
                "resources": map[string]interface{}{
                    "requests": map[string]interface{}{
                        "memory": "1Gi",
                        "cpu":    "500m",
                    },
                },
                "serviceMonitorNamespaceSelector": map[string]interface{}{
                    "matchLabels": map[string]interface{}{
                        "name": namespace,
                    },
                },
            },
        },
    }

    _, err = pd.dynamicClient.Resource(prometheusResource).
        Namespace(namespace).
        Create(ctx, prometheus, metav1.CreateOptions{})

    if err != nil {
        return fmt.Errorf("failed to create Prometheus: %w", err)
    }

    fmt.Printf("Deployed Prometheus in namespace: %s\n", namespace)
    return nil
}

func main() {
    deployer, err := NewPrometheusDeployer()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := deployer.DeployPrometheus(ctx, "team-alpha"); err != nil {
        panic(err)
    }
}
```

## Configuring Grafana for Multi-Namespace Monitoring

Set up Grafana with datasources for each namespace Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus-Federation
      type: prometheus
      access: proxy
      url: http://prometheus-federation.monitoring:9090
      isDefault: true
      editable: false

    - name: Prometheus-TeamAlpha
      type: prometheus
      access: proxy
      url: http://prometheus.team-alpha:9090
      editable: false

    - name: Prometheus-TeamBeta
      type: prometheus
      access: proxy
      url: http://team-prometheus.team-beta:9090
      editable: false
```

## Implementing Namespace-Specific Alerting

Configure AlertManager for namespace-specific alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-alerts
  namespace: team-alpha
spec:
  groups:
  - name: namespace.rules
    interval: 30s
    rules:
    - alert: HighPodMemory
      expr: |
        sum(container_memory_usage_bytes{namespace="team-alpha"})
        / sum(kube_pod_container_resource_limits{namespace="team-alpha", resource="memory"})
        > 0.9
      for: 5m
      labels:
        severity: warning
        namespace: team-alpha
      annotations:
        summary: "High memory usage in namespace team-alpha"
        description: "Namespace team-alpha is using {{ $value | humanizePercentage }} of memory limits"

    - alert: PodCrashLooping
      expr: |
        rate(kube_pod_container_status_restarts_total{namespace="team-alpha"}[15m]) > 0
      for: 5m
      labels:
        severity: critical
        namespace: team-alpha
      annotations:
        summary: "Pod {{ $labels.pod }} is crash looping"
```

This architecture provides isolated monitoring per namespace while maintaining the ability to aggregate metrics centrally for cluster-wide visibility and alerting.
