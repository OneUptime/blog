# How to Build a Custom Prometheus Exporter for Kubernetes CRD Metrics in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Go, Observability, Custom Metrics

Description: Learn how to build a custom Prometheus exporter in Go that scrapes metrics from Kubernetes Custom Resource Definitions (CRDs) and exposes them for monitoring.

---

Custom Resource Definitions (CRDs) extend Kubernetes with domain-specific resources, but monitoring their state requires custom exporters. Building a Prometheus exporter in Go lets you expose CRD metrics for alerting and visualization.

This guide walks through creating a production-ready exporter that watches CRD resources and converts their status fields into Prometheus metrics.

## Understanding CRD Metrics Requirements

CRDs contain valuable operational data that standard Kubernetes metrics miss. For example, a backup CRD might track completion status, duration, and size. A certificate CRD might expose expiration time and renewal status.

The exporter needs to watch CRD resources, extract relevant fields, and expose them as Prometheus metrics with appropriate labels. It should handle resource updates efficiently and maintain metric consistency during pod restarts.

## Setting Up the Go Project Structure

Start by creating a new Go module and importing necessary dependencies.

```go
// main.go
package main

import (
    "context"
    "log"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/dynamic/dynamicinformer"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/cache"
)

// BackupCollector implements prometheus.Collector for backup CRDs
type BackupCollector struct {
    backupStatus  *prometheus.Desc
    backupSize    *prometheus.Desc
    backupDuration *prometheus.Desc
    dynamicClient dynamic.Interface
}
```

The collector uses the dynamic client to watch CRDs without generated client code. This makes the exporter flexible for different CRD types.

## Defining Prometheus Metrics

Define metric descriptors for the CRD fields you want to expose.

```go
func NewBackupCollector(client dynamic.Interface) *BackupCollector {
    return &BackupCollector{
        backupStatus: prometheus.NewDesc(
            "backup_status",
            "Status of backup (1=success, 0=failure)",
            []string{"namespace", "name", "target"},
            nil,
        ),
        backupSize: prometheus.NewDesc(
            "backup_size_bytes",
            "Size of backup in bytes",
            []string{"namespace", "name", "target"},
            nil,
        ),
        backupDuration: prometheus.NewDesc(
            "backup_duration_seconds",
            "Duration of backup operation",
            []string{"namespace", "name", "target"},
            nil,
        ),
        dynamicClient: client,
    }
}

func (c *BackupCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.backupStatus
    ch <- c.backupSize
    ch <- c.backupDuration
}
```

Each metric includes labels for namespace, resource name, and backup target. This provides granular filtering in queries.

## Implementing the Collection Logic

The Collect method queries CRD resources and converts their status to metrics.

```go
func (c *BackupCollector) Collect(ch chan<- prometheus.Metric) {
    ctx := context.Background()

    // Define the CRD resource
    gvr := schema.GroupVersionResource{
        Group:    "backup.example.com",
        Version:  "v1",
        Resource: "backups",
    }

    // List all backup resources across namespaces
    backups, err := c.dynamicClient.Resource(gvr).Namespace("").List(ctx, metav1.ListOptions{})
    if err != nil {
        log.Printf("Error listing backups: %v", err)
        return
    }

    for _, item := range backups.Items {
        c.collectBackupMetrics(ch, &item)
    }
}

func (c *BackupCollector) collectBackupMetrics(ch chan<- prometheus.Metric, backup *unstructured.Unstructured) {
    namespace := backup.GetNamespace()
    name := backup.GetName()

    // Extract status fields from CRD
    status, found, err := unstructured.NestedString(backup.Object, "status", "phase")
    if err != nil || !found {
        return
    }

    target, _, _ := unstructured.NestedString(backup.Object, "spec", "target")

    // Convert status to numeric value
    statusValue := 0.0
    if status == "Completed" {
        statusValue = 1.0
    }

    ch <- prometheus.MustNewConstMetric(
        c.backupStatus,
        prometheus.GaugeValue,
        statusValue,
        namespace, name, target,
    )

    // Extract size if available
    size, found, err := unstructured.NestedInt64(backup.Object, "status", "sizeBytes")
    if err == nil && found {
        ch <- prometheus.MustNewConstMetric(
            c.backupSize,
            prometheus.GaugeValue,
            float64(size),
            namespace, name, target,
        )
    }

    // Extract duration
    startTime, _, _ := unstructured.NestedString(backup.Object, "status", "startTime")
    endTime, _, _ := unstructured.NestedString(backup.Object, "status", "endTime")

    if startTime != "" && endTime != "" {
        start, _ := time.Parse(time.RFC3339, startTime)
        end, _ := time.Parse(time.RFC3339, endTime)
        duration := end.Sub(start).Seconds()

        ch <- prometheus.MustNewConstMetric(
            c.backupDuration,
            prometheus.GaugeValue,
            duration,
            namespace, name, target,
        )
    }
}
```

The unstructured package handles CRDs without type definitions. Extract nested fields carefully and handle missing values gracefully.

## Adding Event-Driven Updates

Instead of polling on every scrape, use an informer to cache CRD state and update metrics only when resources change.

```go
type CachedCollector struct {
    backups map[string]*unstructured.Unstructured
    mutex   sync.RWMutex
    *BackupCollector
}

func (c *CachedCollector) startInformer(ctx context.Context) {
    gvr := schema.GroupVersionResource{
        Group:    "backup.example.com",
        Version:  "v1",
        Resource: "backups",
    }

    factory := dynamicinformer.NewDynamicSharedInformerFactory(c.dynamicClient, 10*time.Minute)
    informer := factory.ForResource(gvr).Informer()

    informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            u := obj.(*unstructured.Unstructured)
            c.mutex.Lock()
            c.backups[u.GetNamespace()+"/"+u.GetName()] = u
            c.mutex.Unlock()
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            u := newObj.(*unstructured.Unstructured)
            c.mutex.Lock()
            c.backups[u.GetNamespace()+"/"+u.GetName()] = u
            c.mutex.Unlock()
        },
        DeleteFunc: func(obj interface{}) {
            u := obj.(*unstructured.Unstructured)
            c.mutex.Lock()
            delete(c.backups, u.GetNamespace()+"/"+u.GetName())
            c.mutex.Unlock()
        },
    })

    informer.Run(ctx.Done())
}

func (c *CachedCollector) Collect(ch chan<- prometheus.Metric) {
    c.mutex.RLock()
    defer c.mutex.RUnlock()

    for _, backup := range c.backups {
        c.collectBackupMetrics(ch, backup)
    }
}
```

The informer watches CRD resources and maintains a local cache. This reduces API server load and improves scrape performance.

## Wiring Up the HTTP Server

Create the main function to register the collector and start the metrics server.

```go
func main() {
    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        log.Fatalf("Error creating config: %v", err)
    }

    // Create dynamic client
    dynamicClient, err := dynamic.NewForConfig(config)
    if err != nil {
        log.Fatalf("Error creating client: %v", err)
    }

    // Create collector with cache
    collector := &CachedCollector{
        backups:         make(map[string]*unstructured.Unstructured),
        BackupCollector: NewBackupCollector(dynamicClient),
    }

    // Start informer in background
    ctx := context.Background()
    go collector.startInformer(ctx)

    // Register collector
    prometheus.MustRegister(collector)

    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())

    log.Println("Starting exporter on :8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        log.Fatalf("Error starting server: %v", err)
    }
}
```

## Deploying the Exporter

Package the exporter as a container and deploy it with appropriate RBAC permissions.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backup-exporter
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: backup-exporter
rules:
- apiGroups: ["backup.example.com"]
  resources: ["backups"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: backup-exporter
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: backup-exporter
subjects:
- kind: ServiceAccount
  name: backup-exporter
  namespace: monitoring
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backup-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backup-exporter
  template:
    metadata:
      labels:
        app: backup-exporter
    spec:
      serviceAccountName: backup-exporter
      containers:
      - name: exporter
        image: your-registry/backup-exporter:latest
        ports:
        - containerPort: 8080
          name: metrics
---
apiVersion: v1
kind: Service
metadata:
  name: backup-exporter
  namespace: monitoring
  labels:
    app: backup-exporter
spec:
  ports:
  - port: 8080
    name: metrics
  selector:
    app: backup-exporter
```

The ServiceAccount needs permission to list and watch the CRD resources across all namespaces.

## Configuring Prometheus Scraping

Add a ServiceMonitor to configure Prometheus scraping.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backup-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: backup-exporter
  endpoints:
  - port: metrics
    interval: 30s
```

Now Prometheus will scrape the exporter every 30 seconds and collect CRD metrics.

## Testing the Metrics

Create a test backup resource and verify metrics appear.

```bash
kubectl apply -f - <<EOF
apiVersion: backup.example.com/v1
kind: Backup
metadata:
  name: test-backup
  namespace: default
spec:
  target: s3://my-bucket
status:
  phase: Completed
  sizeBytes: 1048576
  startTime: "2026-02-09T10:00:00Z"
  endTime: "2026-02-09T10:05:00Z"
EOF

# Query the metrics endpoint
kubectl port-forward -n monitoring svc/backup-exporter 8080:8080
curl http://localhost:8080/metrics | grep backup_
```

You should see metrics like:

```
backup_status{namespace="default",name="test-backup",target="s3://my-bucket"} 1
backup_size_bytes{namespace="default",name="test-backup",target="s3://my-bucket"} 1048576
backup_duration_seconds{namespace="default",name="test-backup",target="s3://my-bucket"} 300
```

Building custom exporters for CRDs provides deep visibility into application-specific resources. Use this pattern to monitor any CRD type in your cluster.
