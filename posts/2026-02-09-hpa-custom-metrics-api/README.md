# How to implement HPA with custom metrics API server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Metrics

Description: Learn how to implement a custom metrics API server for Horizontal Pod Autoscaler to scale workloads based on application-specific metrics.

---

The Horizontal Pod Autoscaler supports three types of metrics: resource metrics (CPU/memory), custom metrics (application metrics from pods), and external metrics (metrics from outside the cluster). While Prometheus Adapter covers many use cases, implementing your own custom metrics API server gives you complete control over metric collection, aggregation, and scaling logic. This guide walks you through building and deploying a custom metrics API server for HPA.

## Understanding the Custom Metrics API

The Custom Metrics API is a Kubernetes extension API that allows HPA to query application-specific metrics. It implements the `custom.metrics.k8s.io` API group and provides metrics associated with Kubernetes objects like Pods, Deployments, or Services.

The API server must implement these endpoints:

- List available metrics: `GET /apis/custom.metrics.k8s.io/v1beta2/`
- Get metric for a specific resource: `GET /apis/custom.metrics.k8s.io/v1beta2/namespaces/{namespace}/{resourceType}/{resourceName}/{metricName}`
- Get metric for multiple resources: `GET /apis/custom.metrics.k8s.io/v1beta2/namespaces/{namespace}/{resourceType}/*/{metricName}`

## When to Build a Custom API Server

Consider building a custom metrics API server when:

- You have proprietary metrics systems not supported by existing adapters
- You need complex aggregation logic that Prometheus queries cannot express
- You want to implement custom caching or rate limiting for metric queries
- Your metrics come from multiple sources that need unified access
- You need specialized authentication or authorization for metric access

For most use cases, Prometheus Adapter suffices. Build custom only when you have specific requirements it cannot meet.

## Architecture Overview

A custom metrics API server consists of:

1. A REST API implementing the custom metrics endpoints
2. A metrics collector that fetches data from your metrics backend
3. APIService registration to integrate with Kubernetes API aggregation
4. RBAC configuration for HPA to query metrics

## Building the API Server

We'll build a simple custom metrics API server in Go that exposes request queue depth from a Redis backend.

Start with the basic project structure:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "strings"

    "github.com/go-redis/redis/v8"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/metrics/pkg/apis/custom_metrics/v1beta2"
)

type MetricsServer struct {
    redisClient *redis.Client
}

func NewMetricsServer(redisAddr string) *MetricsServer {
    client := redis.NewClient(&redis.Options{
        Addr: redisAddr,
    })
    return &MetricsServer{
        redisClient: client,
    }
}

// Implement the custom metrics API endpoints
func (s *MetricsServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    path := r.URL.Path

    // Handle list metrics endpoint
    if path == "/apis/custom.metrics.k8s.io/v1beta2/" {
        s.handleListMetrics(w, r)
        return
    }

    // Handle get metric for resource
    if strings.Contains(path, "/namespaces/") {
        s.handleGetMetric(w, r)
        return
    }

    http.NotFound(w, r)
}

func (s *MetricsServer) handleListMetrics(w http.ResponseWriter, r *http.Request) {
    list := &metav1.APIResourceList{
        TypeMeta: metav1.TypeMeta{
            Kind:       "APIResourceList",
            APIVersion: "v1",
        },
        GroupVersion: "custom.metrics.k8s.io/v1beta2",
        APIResources: []metav1.APIResource{
            {
                Name:       "deployments/queue_depth",
                Namespaced: true,
                Kind:       "MetricValueList",
                Verbs:      []string{"get"},
            },
        },
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(list)
}

func (s *MetricsServer) handleGetMetric(w http.ResponseWriter, r *http.Request) {
    // Parse path: /apis/custom.metrics.k8s.io/v1beta2/namespaces/{ns}/deployments/{name}/queue_depth
    parts := strings.Split(r.URL.Path, "/")
    if len(parts) < 9 {
        http.Error(w, "Invalid path", http.StatusBadRequest)
        return
    }

    namespace := parts[6]
    deploymentName := parts[8]
    metricName := parts[9]

    if metricName != "queue_depth" {
        http.NotFound(w, r)
        return
    }

    // Fetch actual queue depth from Redis
    ctx := context.Background()
    queueKey := fmt.Sprintf("queue:%s:%s", namespace, deploymentName)
    queueLen, err := s.redisClient.LLen(ctx, queueKey).Result()
    if err != nil {
        log.Printf("Error fetching queue depth: %v", err)
        queueLen = 0
    }

    // Build metric response
    metric := v1beta2.MetricValue{
        DescribedObject: v1beta2.ObjectReference{
            APIVersion: "apps/v1",
            Kind:       "Deployment",
            Name:       deploymentName,
            Namespace:  namespace,
        },
        MetricName: "queue_depth",
        Timestamp:  metav1.Now(),
        Value:      *resource.NewQuantity(queueLen, resource.DecimalSI),
    }

    response := v1beta2.MetricValueList{
        TypeMeta: metav1.TypeMeta{
            Kind:       "MetricValueList",
            APIVersion: "custom.metrics.k8s.io/v1beta2",
        },
        Items: []v1beta2.MetricValue{metric},
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    redisAddr := os.Getenv("REDIS_ADDR")
    if redisAddr == "" {
        redisAddr = "localhost:6379"
    }

    server := NewMetricsServer(redisAddr)

    log.Println("Starting custom metrics API server on :8080")
    if err := http.ListenAndServeTLS(":8080", "/certs/tls.crt", "/certs/tls.key", server); err != nil {
        log.Fatal(err)
    }
}
```

This server exposes a `queue_depth` metric for Deployments, fetching the actual queue length from Redis.

## Creating TLS Certificates

The custom metrics API must use HTTPS. Generate certificates using cert-manager or manually:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: custom-metrics-apiserver
  namespace: custom-metrics
spec:
  secretName: custom-metrics-tls
  duration: 8760h # 1 year
  renewBefore: 720h # 30 days
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - custom-metrics-apiserver.custom-metrics.svc
  - custom-metrics-apiserver.custom-metrics.svc.cluster.local
```

## Deploying the API Server

Create a Deployment for the custom metrics API server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-metrics-apiserver
  namespace: custom-metrics
spec:
  replicas: 2
  selector:
    matchLabels:
      app: custom-metrics-apiserver
  template:
    metadata:
      labels:
        app: custom-metrics-apiserver
    spec:
      containers:
      - name: apiserver
        image: myorg/custom-metrics-apiserver:1.0
        ports:
        - containerPort: 8080
          name: https
        env:
        - name: REDIS_ADDR
          value: "redis.default.svc.cluster.local:6379"
        volumeMounts:
        - name: tls
          mountPath: /certs
          readOnly: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      volumes:
      - name: tls
        secret:
          secretName: custom-metrics-tls
---
apiVersion: v1
kind: Service
metadata:
  name: custom-metrics-apiserver
  namespace: custom-metrics
spec:
  ports:
  - port: 443
    targetPort: 8080
    name: https
  selector:
    app: custom-metrics-apiserver
```

## Registering the APIService

Register your custom metrics API with Kubernetes API aggregation:

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1beta2.custom.metrics.k8s.io
spec:
  service:
    name: custom-metrics-apiserver
    namespace: custom-metrics
    port: 443
  group: custom.metrics.k8s.io
  version: v1beta2
  insecureSkipTLSVerify: false
  caBundle: LS0tLS1CRUdJTi... # Base64-encoded CA certificate
  groupPriorityMinimum: 100
  versionPriority: 100
```

Get the CA bundle from your certificate:

```bash
kubectl get secret custom-metrics-tls -n custom-metrics -o jsonpath='{.data.ca\.crt}'
```

## Configuring RBAC

Create RBAC rules for HPA to query the custom metrics API:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: custom-metrics-reader
rules:
- apiGroups:
  - custom.metrics.k8s.io
  resources:
  - "*"
  verbs:
  - get
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: hpa-custom-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: custom-metrics-reader
subjects:
- kind: ServiceAccount
  name: horizontal-pod-autoscaler
  namespace: kube-system
```

## Creating HPA with Custom Metrics

Now create an HPA that uses your custom metric:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: task-processor-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-processor
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Object
    object:
      metric:
        name: queue_depth
      describedObject:
        apiVersion: apps/v1
        kind: Deployment
        name: task-processor
      target:
        type: Value
        value: "100"
```

## Testing the Implementation

Verify the custom metrics API is available:

```bash
kubectl get apiservices v1beta2.custom.metrics.k8s.io
```

Query the metric directly:

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta2/namespaces/default/deployments/task-processor/queue_depth" | jq
```

You should see the queue depth value returned as a metric.

## Advanced Features

Add caching to reduce load on your metrics backend:

```go
type CachedMetricsServer struct {
    *MetricsServer
    cache     map[string]metricCacheEntry
    cacheTTL  time.Duration
}

type metricCacheEntry struct {
    value     int64
    timestamp time.Time
}

func (s *CachedMetricsServer) getQueueDepth(namespace, name string) int64 {
    key := fmt.Sprintf("%s/%s", namespace, name)

    if entry, ok := s.cache[key]; ok {
        if time.Since(entry.timestamp) < s.cacheTTL {
            return entry.value
        }
    }

    // Fetch fresh value
    value := s.fetchFromRedis(namespace, name)
    s.cache[key] = metricCacheEntry{
        value:     value,
        timestamp: time.Now(),
    }

    return value
}
```

## Monitoring and Observability

Instrument your custom metrics API server with Prometheus metrics:

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    metricsRequests = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "custom_metrics_requests_total",
            Help: "Total number of custom metrics requests",
        },
        []string{"namespace", "resource", "metric"},
    )
)
```

## Conclusion

Building a custom metrics API server gives you complete control over how HPA scales your workloads. While most scenarios are covered by existing solutions like Prometheus Adapter, custom implementations enable specialized scaling logic, unique metric sources, and advanced features like intelligent caching. Follow the custom metrics API specification closely, implement proper TLS and RBAC, and monitor your API server's performance to ensure reliable autoscaling.
