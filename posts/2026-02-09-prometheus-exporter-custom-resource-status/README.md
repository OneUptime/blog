# How to Build a Prometheus Exporter That Scrapes Kubernetes Custom Resource Status Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, CRD, Exporter, Observability

Description: Learn how to build a Prometheus exporter that monitors Kubernetes Custom Resource Definition status fields and exposes them as metrics for alerting and visualization.

---

Kubernetes Custom Resource Definitions (CRDs) contain valuable operational status in their status fields, but standard Kubernetes metrics don't expose this data. Building a custom exporter that watches CRD status changes provides deep visibility into operator-managed resources.

This guide covers creating an exporter that converts CRD status to Prometheus metrics.

## Understanding CRD Status Fields

CRDs use status subresources to track operational state. For example, a Backup CRD might have:

```yaml
apiVersion: backup.example.com/v1
kind: Backup
metadata:
  name: daily-backup
status:
  phase: Completed
  startTime: "2026-02-09T10:00:00Z"
  completionTime: "2026-02-09T10:15:00Z"
  size: 1073741824
  lastError: ""
  successCount: 42
  failureCount: 1
```

An exporter transforms this into metrics:

```
backup_phase{name="daily-backup",namespace="default",phase="Completed"} 1
backup_duration_seconds{name="daily-backup",namespace="default"} 900
backup_size_bytes{name="daily-backup",namespace="default"} 1073741824
backup_success_total{name="daily-backup",namespace="default"} 42
backup_failures_total{name="daily-backup",namespace="default"} 1
```

## Building the Exporter in Go

Create a Go exporter using client-go and the Prometheus client library:

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
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/dynamic/dynamicinformer"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/cache"
)

// Define Prometheus metrics
var (
    backupPhase = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_phase",
            Help: "Current phase of backup (1=running, 2=completed, 3=failed)",
        },
        []string{"namespace", "name", "phase"},
    )

    backupDuration = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_duration_seconds",
            Help: "Duration of backup in seconds",
        },
        []string{"namespace", "name"},
    )

    backupSize = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_size_bytes",
            Help: "Size of backup in bytes",
        },
        []string{"namespace", "name"},
    )

    backupSuccess = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_success_total",
            Help: "Total successful backups",
        },
        []string{"namespace", "name"},
    )

    backupFailures = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "backup_failures_total",
            Help: "Total failed backups",
        },
        []string{"namespace", "name"},
    )
)

func init() {
    // Register metrics
    prometheus.MustRegister(backupPhase)
    prometheus.MustRegister(backupDuration)
    prometheus.MustRegister(backupSize)
    prometheus.MustRegister(backupSuccess)
    prometheus.MustRegister(backupFailures)
}

func main() {
    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        log.Fatal(err)
    }

    // Create dynamic client
    dynamicClient, err := dynamic.NewForConfig(config)
    if err != nil {
        log.Fatal(err)
    }

    // Define CRD GroupVersionResource
    gvr := schema.GroupVersionResource{
        Group:    "backup.example.com",
        Version:  "v1",
        Resource: "backups",
    }

    // Create informer to watch CRD changes
    factory := dynamicinformer.NewDynamicSharedInformerFactory(
        dynamicClient,
        10*time.Minute,
    )
    informer := factory.ForResource(gvr).Informer()

    // Add event handlers
    informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc:    handleBackupUpdate,
        UpdateFunc: func(oldObj, newObj interface{}) {
            handleBackupUpdate(newObj)
        },
        DeleteFunc: handleBackupDelete,
    })

    // Start informer
    ctx := context.Background()
    go informer.Run(ctx.Done())

    // Wait for cache sync
    if !cache.WaitForCacheSync(ctx.Done(), informer.HasSynced) {
        log.Fatal("Failed to sync cache")
    }

    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    log.Println("Starting exporter on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleBackupUpdate(obj interface{}) {
    backup := obj.(*unstructured.Unstructured)
    namespace := backup.GetNamespace()
    name := backup.GetName()

    // Extract status fields
    status, found, _ := unstructured.NestedString(backup.Object, "status", "phase")
    if !found {
        return
    }

    // Set phase metric
    backupPhase.Reset()
    phaseValue := 0.0
    switch status {
    case "Running":
        phaseValue = 1.0
    case "Completed":
        phaseValue = 2.0
    case "Failed":
        phaseValue = 3.0
    }
    backupPhase.WithLabelValues(namespace, name, status).Set(phaseValue)

    // Extract and set duration
    startTime, _, _ := unstructured.NestedString(backup.Object, "status", "startTime")
    completionTime, _, _ := unstructured.NestedString(backup.Object, "status", "completionTime")

    if startTime != "" && completionTime != "" {
        start, _ := time.Parse(time.RFC3339, startTime)
        completion, _ := time.Parse(time.RFC3339, completionTime)
        duration := completion.Sub(start).Seconds()
        backupDuration.WithLabelValues(namespace, name).Set(duration)
    }

    // Extract and set size
    size, found, _ := unstructured.NestedInt64(backup.Object, "status", "size")
    if found {
        backupSize.WithLabelValues(namespace, name).Set(float64(size))
    }

    // Extract counters
    successCount, found, _ := unstructured.NestedInt64(backup.Object, "status", "successCount")
    if found {
        backupSuccess.WithLabelValues(namespace, name).Set(float64(successCount))
    }

    failureCount, found, _ := unstructured.NestedInt64(backup.Object, "status", "failureCount")
    if found {
        backupFailures.WithLabelValues(namespace, name).Set(float64(failureCount))
    }
}

func handleBackupDelete(obj interface{}) {
    backup := obj.(*unstructured.Unstructured)
    namespace := backup.GetNamespace()
    name := backup.GetName()

    // Remove metrics for deleted backup
    backupPhase.DeleteLabelValues(namespace, name, "")
    backupDuration.DeleteLabelValues(namespace, name)
    backupSize.DeleteLabelValues(namespace, name)
    backupSuccess.DeleteLabelValues(namespace, name)
    backupFailures.DeleteLabelValues(namespace, name)
}
```

## Creating the Dockerfile

Package the exporter as a container:

```dockerfile
FROM golang:1.21 AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o exporter .

FROM alpine:3.18
RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=builder /app/exporter .

EXPOSE 8080
CMD ["./exporter"]
```

Build and push:

```bash
docker build -t myregistry/backup-exporter:v1.0.0 .
docker push myregistry/backup-exporter:v1.0.0
```

## Deploying to Kubernetes

Create deployment with RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backup-exporter
  namespace: monitoring
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
        image: myregistry/backup-exporter:v1.0.0
        ports:
        - containerPort: 8080
          name: metrics
        resources:
          requests:
            memory: 64Mi
            cpu: 50m
          limits:
            memory: 128Mi
            cpu: 100m
---
apiVersion: v1
kind: Service
metadata:
  name: backup-exporter
  namespace: monitoring
  labels:
    app: backup-exporter
spec:
  selector:
    app: backup-exporter
  ports:
  - port: 8080
    name: metrics
```

## Configuring Prometheus Scraping

Add ServiceMonitor for automatic scraping:

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
    path: /metrics
```

## Adding Health Checks

Implement health endpoints:

```go
func main() {
    // ... existing code ...

    http.HandleFunc("/health", healthCheck)
    http.HandleFunc("/ready", readyCheck)
    http.Handle("/metrics", promhttp.Handler())

    log.Fatal(http.ListenAndServe(":8080", nil))
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("healthy"))
}

func readyCheck(w http.ResponseWriter, r *http.Request) {
    // Check if informer is synced
    if informerSynced {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("ready"))
    } else {
        w.WriteHeader(http.StatusServiceUnavailable)
        w.Write([]byte("not ready"))
    }
}
```

## Creating Alerts for CRD Status

Define alerts based on CRD metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backup-alerts
  namespace: monitoring
spec:
  groups:
  - name: backup
    rules:
    - alert: BackupFailed
      expr: backup_phase{phase="Failed"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Backup {{ $labels.name }} failed"
        description: "Backup in namespace {{ $labels.namespace }} has failed"

    - alert: BackupTooLong
      expr: backup_duration_seconds > 3600
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Backup {{ $labels.name }} taking too long"
        description: "Backup duration is {{ $value }} seconds"

    - alert: BackupFailureRate
      expr: |
        (
          backup_failures_total /
          (backup_failures_total + backup_success_total)
        ) > 0.1
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "High backup failure rate"
        description: "{{ $value | humanizePercentage }} of backups failing"
```

## Supporting Multiple CRD Types

Extend the exporter to handle multiple CRD types:

```go
type CRDConfig struct {
    Group    string
    Version  string
    Resource string
    Handler  func(obj *unstructured.Unstructured)
}

func startWatcher(client dynamic.Interface, config CRDConfig) {
    gvr := schema.GroupVersionResource{
        Group:    config.Group,
        Version:  config.Version,
        Resource: config.Resource,
    }

    factory := dynamicinformer.NewDynamicSharedInformerFactory(client, 10*time.Minute)
    informer := factory.ForResource(gvr).Informer()

    informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc:    config.Handler,
        UpdateFunc: func(_, newObj interface{}) { config.Handler(newObj) },
    })

    go informer.Run(context.Background().Done())
}

func main() {
    // Watch multiple CRDs
    configs := []CRDConfig{
        {
            Group: "backup.example.com",
            Version: "v1",
            Resource: "backups",
            Handler: handleBackupUpdate,
        },
        {
            Group: "cert.example.com",
            Version: "v1",
            Resource: "certificates",
            Handler: handleCertificateUpdate,
        },
    }

    for _, config := range configs {
        startWatcher(dynamicClient, config)
    }
}
```

Building custom exporters for CRDs provides deep observability into operator-managed resources, enabling proactive monitoring and alerting for application-specific metrics.
