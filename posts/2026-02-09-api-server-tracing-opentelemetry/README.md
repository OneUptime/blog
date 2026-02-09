# How to Use Kubernetes API Server Tracing with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Observability

Description: Learn how to enable and use Kubernetes API server tracing with OpenTelemetry to diagnose performance issues, understand request flows, and optimize cluster operations.

---

Understanding what happens inside the Kubernetes API server is crucial for diagnosing performance issues and optimizing cluster operations. Starting with Kubernetes 1.22, the API server supports distributed tracing using OpenTelemetry, giving you deep visibility into request processing, admission control, authentication, and storage operations.

## Why API Server Tracing Matters

The API server is the heart of your cluster. Every kubectl command, controller reconciliation, and webhook call goes through it. When the API server is slow, everything is slow. Tracing helps you understand:

- Which requests are slowest
- Where time is spent (admission webhooks, etcd, etc.)
- How requests flow through the system
- Which components cause bottlenecks

## Enabling API Server Tracing

API server tracing requires feature gates and configuration. Edit the API server manifest:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    # Enable tracing feature gate
    - --feature-gates=APIServerTracing=true
    # Point to tracing configuration
    - --tracing-config-file=/etc/kubernetes/tracing-config.yaml
    volumeMounts:
    - name: tracing-config
      mountPath: /etc/kubernetes/tracing-config.yaml
      readOnly: true
  volumes:
  - name: tracing-config
    hostPath:
      path: /etc/kubernetes/tracing-config.yaml
```

Create the tracing configuration file:

```yaml
# /etc/kubernetes/tracing-config.yaml
apiVersion: apiserver.config.k8s.io/v1beta1
kind: TracingConfiguration
# Endpoint to send traces (usually an OpenTelemetry collector)
endpoint: localhost:4317
# Sampling rate (1.0 = 100%, 0.1 = 10%)
samplingRatePerMillion: 1000000
```

This configuration sends all traces to an OpenTelemetry collector running on localhost:4317.

## Deploying an OpenTelemetry Collector

Deploy a collector to receive and export traces:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: kube-system
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 10s

    exporters:
      # Export to Jaeger
      jaeger:
        endpoint: jaeger-collector.observability:14250
        tls:
          insecure: true

      # Or export to console for debugging
      logging:
        loglevel: debug

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [jaeger, logging]
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      hostNetwork: true
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector:latest
        args:
        - --config=/etc/otel/config.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

Apply this configuration:

```bash
kubectl apply -f otel-collector.yaml
```

## Understanding API Server Trace Spans

The API server creates spans for different phases of request processing:

**Request handling**:
- HTTP request received
- Authentication
- Authorization
- Admission (mutating and validating webhooks)
- Quota checking
- Object conversion
- Validation

**Storage operations**:
- etcd read
- etcd write
- Watch initialization

**Response preparation**:
- Serialization
- Compression
- Response sent

Each span includes:
- Duration
- Attributes (resource type, verb, user, etc.)
- Parent-child relationships

## Analyzing Traces in Jaeger

Deploy Jaeger to visualize traces:

```bash
kubectl create namespace observability

kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: observability
spec:
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        ports:
        - containerPort: 16686  # Jaeger UI
        - containerPort: 14250  # gRPC collector
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: observability
spec:
  selector:
    app: jaeger
  ports:
  - name: grpc
    port: 14250
    targetPort: 14250
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-ui
  namespace: observability
spec:
  type: NodePort
  selector:
    app: jaeger
  ports:
  - port: 16686
    targetPort: 16686
    nodePort: 30686
EOF
```

Access Jaeger UI:

```bash
kubectl port-forward -n observability svc/jaeger-ui 16686:16686
# Open http://localhost:16686
```

## Generating Traced Requests

Make API requests to generate traces:

```bash
# Create a deployment (traced)
kubectl create deployment nginx --image=nginx

# List pods (traced)
kubectl get pods

# Update a resource (traced)
kubectl scale deployment nginx --replicas=3

# Delete a resource (traced)
kubectl delete deployment nginx
```

Each operation creates a trace in Jaeger showing:
- Total request duration
- Time spent in each phase
- Admission webhook latency
- etcd operation duration

## Analyzing Slow Requests

In Jaeger UI, search for slow requests:

1. Filter by service: `kube-apiserver`
2. Filter by minimum duration: `> 1s`
3. Look for spans that took most of the time

Common slow spans:
- **Admission webhooks**: If a webhook span is slow, check the webhook service
- **etcd operations**: If etcd spans are slow, investigate etcd performance
- **List operations**: Large lists can be slow; check pagination usage
- **Watch initialization**: Initial watch setup can be expensive

## Configuring Sampling

Tracing every request creates overhead. Use sampling to reduce load:

```yaml
# Sample 10% of requests
apiVersion: apiserver.config.k8s.io/v1beta1
kind: TracingConfiguration
endpoint: localhost:4317
samplingRatePerMillion: 100000  # 10%
```

Or use adaptive sampling based on request characteristics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: kube-system
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      # Tail-based sampling: keep slow requests and errors
      tail_sampling:
        decision_wait: 10s
        policies:
          # Always sample errors
          - name: errors
            type: status_code
            status_code:
              status_codes: [ERROR]
          # Sample slow requests (> 1s)
          - name: slow-requests
            type: latency
            latency:
              threshold_ms: 1000
          # Sample 1% of normal requests
          - name: random-sample
            type: probabilistic
            probabilistic:
              sampling_percentage: 1

    exporters:
      jaeger:
        endpoint: jaeger-collector.observability:14250
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [tail_sampling]
          exporters: [jaeger]
```

This keeps all slow requests and errors while sampling only 1% of normal requests.

## Correlating with Application Traces

If your applications use OpenTelemetry, you can correlate API server traces with application traces:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func callKubernetes(ctx context.Context, clientset *kubernetes.Clientset) {
    // Context contains trace information
    pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{})

    // The API server will continue the trace started in your application
    // You'll see both application and API server spans in Jaeger
}
```

## Identifying Bottlenecks

Use traces to find bottlenecks:

**Slow admission webhooks**:

```bash
# In Jaeger, filter by:
# - Service: kube-apiserver
# - Tags: admission.webhook.name=<webhook-name>
# Sort by duration descending
```

Look for webhooks consistently taking > 100ms.

**Slow etcd operations**:

```bash
# Filter by:
# - Service: kube-apiserver
# - Tags: component=etcd
# - Duration > 100ms
```

If etcd operations are slow:
- Check etcd disk latency
- Review etcd metrics
- Consider scaling etcd

**Expensive list operations**:

```bash
# Filter by:
# - Service: kube-apiserver
# - Tags: verb=list
# - Duration > 1s
```

Large lists indicate:
- Need for pagination
- Excessive polling by controllers
- Resource count is too high

## Monitoring Trace Metrics

Export trace metrics to Prometheus:

```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889

  spanmetrics:
    metrics_exporter: prometheus
    latency_histogram_buckets: [100us, 1ms, 10ms, 100ms, 1s, 10s]
    dimensions:
      - name: http.method
      - name: http.status_code

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger, spanmetrics]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

This generates RED metrics (Rate, Errors, Duration) from traces.

## Best Practices

1. **Start with low sampling**: Begin with 1-10% sampling to minimize overhead

2. **Sample important requests**: Always sample slow requests and errors

3. **Monitor collector performance**: Ensure the collector can handle the load

4. **Correlate with metrics**: Use traces alongside Prometheus metrics

5. **Set retention policies**: Traces can consume significant storage

6. **Focus on outliers**: Investigate requests that are significantly slower than average

7. **Document baseline performance**: Know what normal latency looks like

## Troubleshooting

**No traces appearing**:

```bash
# Check API server is sending traces
kubectl logs -n kube-system kube-apiserver-xxx | grep -i trace

# Check collector is receiving traces
kubectl logs -n kube-system otel-collector-xxx | grep -i span

# Verify endpoint is correct
kubectl get pod -n kube-system kube-apiserver-xxx -o yaml | grep endpoint
```

**High overhead**:

```yaml
# Reduce sampling rate
samplingRatePerMillion: 10000  # 1% instead of 100%
```

**Collector crashing**:

```yaml
# Increase resource limits
resources:
  limits:
    memory: 2Gi
    cpu: 1000m
  requests:
    memory: 512Mi
    cpu: 200m
```

## Conclusion

Kubernetes API server tracing with OpenTelemetry provides unprecedented visibility into cluster operations. By enabling tracing, deploying collectors, and analyzing traces in Jaeger, you can identify performance bottlenecks, understand request flows, and optimize your cluster for better reliability and performance. Start with low sampling rates to minimize overhead, focus on slow requests and errors, and use traces alongside metrics for comprehensive observability. Whether you are debugging specific issues or proactively optimizing performance, API server tracing is an essential tool for operating Kubernetes at scale.
