# How to Set Up OpenTelemetry on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OpenTelemetry, Observability, Kubernetes, Tracing, Metrics, Logging

Description: Deploy the OpenTelemetry Collector on Talos Linux and configure unified observability for traces, metrics, and logs in Kubernetes.

---

OpenTelemetry is the industry standard for collecting telemetry data from applications. It provides a single set of APIs, SDKs, and tools for generating and collecting traces, metrics, and logs. Instead of instrumenting your applications with vendor-specific libraries, you instrument once with OpenTelemetry and send data to whatever backend you choose. On Talos Linux, the OpenTelemetry Collector acts as a central pipeline that receives, processes, and exports telemetry data. This guide walks through deploying the full OpenTelemetry stack on a Talos Linux Kubernetes cluster.

## Why OpenTelemetry

Before OpenTelemetry, every observability tool had its own instrumentation library. If you wanted to switch from one tracing backend to another, you had to re-instrument your code. OpenTelemetry solves this by providing a vendor-neutral standard. Your applications emit telemetry in the OpenTelemetry format, and the Collector routes it to whatever backends you use, whether that is Prometheus, Jaeger, Elasticsearch, or a commercial SaaS platform.

The three pillars of observability that OpenTelemetry covers:

- **Traces**: Request flow across services with timing information
- **Metrics**: Numerical measurements like request counts, latencies, and resource usage
- **Logs**: Structured log events correlated with traces and metrics

## Architecture

The OpenTelemetry Collector can be deployed in two patterns on Talos Linux:

1. **Agent mode (DaemonSet)**: One collector per node that receives telemetry from local pods
2. **Gateway mode (Deployment)**: A centralized collector that aggregates data from multiple agents

We will deploy both for a production-ready setup.

## Step 1: Install the OpenTelemetry Operator

The OpenTelemetry Operator simplifies deploying and managing collectors:

```bash
# Install cert-manager if not already installed
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=300s

# Install the OpenTelemetry Operator
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
```

Verify the operator is running:

```bash
kubectl get pods -n opentelemetry-operator-system
```

## Step 2: Deploy the Collector as a DaemonSet (Agent Mode)

The agent collector runs on every node and collects telemetry from local pods:

```yaml
# otel-agent.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-agent
  namespace: observability
spec:
  mode: daemonset
  config:
    receivers:
      # Receive OTLP data from applications
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Collect host metrics from the node
      hostmetrics:
        collection_interval: 30s
        scrapers:
          cpu: {}
          disk: {}
          filesystem: {}
          load: {}
          memory: {}
          network: {}
          process: {}
          processes: {}

      # Collect Kubernetes pod metrics
      kubeletstats:
        collection_interval: 30s
        auth_type: serviceAccount
        endpoint: "${env:K8S_NODE_NAME}:10250"
        insecure_skip_verify: true

    processors:
      # Add Kubernetes metadata to telemetry
      k8sattributes:
        auth_type: serviceAccount
        passthrough: false
        extract:
          metadata:
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.deployment.name
            - k8s.namespace.name
            - k8s.node.name
            - k8s.container.name
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.ip
          - sources:
              - from: connection

      # Batch telemetry for efficient export
      batch:
        send_batch_size: 1000
        timeout: 10s

      # Add resource detection
      resourcedetection:
        detectors: [env, system, gcp, aws]
        timeout: 5s

      # Memory limiter to prevent OOM
      memory_limiter:
        check_interval: 5s
        limit_mib: 400
        spike_limit_mib: 100

    exporters:
      # Forward to the gateway collector
      otlp:
        endpoint: otel-gateway-collector.observability.svc.cluster.local:4317
        tls:
          insecure: true

      # Debug exporter for troubleshooting
      debug:
        verbosity: basic

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp]
        metrics:
          receivers: [otlp, hostmetrics, kubeletstats]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp]

  env:
    - name: K8S_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName

  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

## Step 3: Deploy the Collector as a Gateway

The gateway aggregates data from all agents and exports to your backends:

```yaml
# otel-gateway.yaml
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-gateway
  namespace: observability
spec:
  mode: deployment
  replicas: 2
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        send_batch_size: 5000
        timeout: 15s

      memory_limiter:
        check_interval: 5s
        limit_mib: 1500
        spike_limit_mib: 500

      # Tail-based sampling for traces
      tail_sampling:
        decision_wait: 10s
        num_traces: 100000
        expected_new_traces_per_sec: 1000
        policies:
          # Always sample errors
          - name: errors
            type: status_code
            status_code:
              status_codes: [ERROR]
          # Always sample slow requests (over 2 seconds)
          - name: slow-requests
            type: latency
            latency:
              threshold_ms: 2000
          # Sample 10% of everything else
          - name: probabilistic
            type: probabilistic
            probabilistic:
              sampling_percentage: 10

    exporters:
      # Export traces to Jaeger
      otlp/jaeger:
        endpoint: jaeger-collector.tracing.svc.cluster.local:4317
        tls:
          insecure: true

      # Export metrics to Prometheus
      prometheusremotewrite:
        endpoint: http://prometheus-stack-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090/api/v1/write

      # Export logs to Elasticsearch
      elasticsearch:
        endpoints: ["http://elasticsearch.logging.svc.cluster.local:9200"]
        logs_index: otel-logs
        sending_queue:
          enabled: true
          num_consumers: 20
          queue_size: 1000

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, tail_sampling, batch]
          exporters: [otlp/jaeger]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [elasticsearch]

  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
```

Apply both collectors:

```bash
kubectl create namespace observability
kubectl apply -f otel-agent.yaml
kubectl apply -f otel-gateway.yaml
```

## Step 4: Instrument Applications

Configure your applications to send telemetry to the local agent collector.

### Auto-Instrumentation with the Operator

The OpenTelemetry Operator supports automatic instrumentation for Java, Python, Node.js, and .NET:

```yaml
# auto-instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: auto-instrumentation
  namespace: default
spec:
  exporter:
    endpoint: http://otel-agent-collector.observability.svc.cluster.local:4318
  propagators:
    - tracecontext
    - baggage
  sampler:
    type: parentbased_traceidratio
    argument: "0.1"
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
```

Then annotate your deployments to enable auto-instrumentation:

```yaml
# For Python apps
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-python: "true"

# For Node.js apps
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"

# For Java apps
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-java: "true"
```

### Manual SDK Configuration

For more control, configure the SDK via environment variables in your deployment:

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://otel-agent-collector.observability.svc.cluster.local:4318"
  - name: OTEL_SERVICE_NAME
    value: "my-service"
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "deployment.environment=production,service.version=1.0.0"
  - name: OTEL_TRACES_SAMPLER
    value: "parentbased_traceidratio"
  - name: OTEL_TRACES_SAMPLER_ARG
    value: "0.1"
```

## Step 5: Verify the Pipeline

Check that data is flowing through the entire pipeline:

```bash
# Check agent collector pods
kubectl get pods -n observability -l app.kubernetes.io/name=otel-agent-collector

# Check gateway collector pods
kubectl get pods -n observability -l app.kubernetes.io/name=otel-gateway-collector

# Check agent collector logs for received data
kubectl logs -n observability daemonset/otel-agent-collector --tail=50

# Check gateway collector logs
kubectl logs -n observability deployment/otel-gateway-collector --tail=50
```

## Monitoring the Collectors

The collectors expose their own metrics. Create a ServiceMonitor to scrape them:

```yaml
# otel-collector-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: otel-collectors
  namespace: observability
spec:
  selector:
    matchLabels:
      app.kubernetes.io/managed-by: opentelemetry-operator
  endpoints:
    - port: monitoring
      interval: 30s
```

Key metrics to watch:

```promql
# Spans received per second
rate(otelcol_receiver_accepted_spans[5m])

# Spans dropped per second (should be zero)
rate(otelcol_receiver_refused_spans[5m])

# Export failures
rate(otelcol_exporter_send_failed_spans[5m])

# Queue utilization
otelcol_exporter_queue_size / otelcol_exporter_queue_capacity
```

## Conclusion

OpenTelemetry on Talos Linux gives you a vendor-neutral, unified observability pipeline. The agent-gateway architecture handles scale gracefully, and the operator makes it easy to manage collectors and auto-instrument applications. By standardizing on OpenTelemetry, you keep your options open for backends while building a consistent instrumentation layer across all your services. Start with the auto-instrumentation feature for quick wins, then add custom spans and metrics where you need deeper visibility.
