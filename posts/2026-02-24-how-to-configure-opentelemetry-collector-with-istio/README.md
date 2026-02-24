# How to Configure OpenTelemetry Collector with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Observability, Tracing, Kubernetes

Description: Complete guide to deploying and configuring the OpenTelemetry Collector to work with Istio for traces, metrics, and access logs.

---

The OpenTelemetry Collector is the glue between Istio's telemetry output and your observability backends. It receives traces, metrics, and logs from Istio's Envoy proxies, processes them, and exports them to whatever backends you use. Whether you are running Jaeger, Prometheus, Grafana Tempo, Datadog, or any combination of backends, the OTel Collector handles the fan-out.

Getting the Collector properly integrated with Istio takes some configuration on both sides. Here is how to set it up end to end.

## Architecture Overview

The data flow looks like this:

1. Envoy sidecar proxies generate telemetry data (traces, metrics, access logs)
2. Proxies send the data to the OpenTelemetry Collector using OTLP (OpenTelemetry Protocol)
3. The Collector processes the data (batching, filtering, enriching)
4. The Collector exports the data to one or more backends

You can deploy the Collector as a central Deployment (recommended for small to medium meshes) or as a DaemonSet (better for high-volume meshes where you want node-local collection).

## Deploying the OpenTelemetry Collector

Start with a basic Collector deployment:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: observability
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
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
        timeout: 5s
        send_batch_size: 1024
        send_batch_max_size: 2048
      memory_limiter:
        check_interval: 1s
        limit_mib: 1024
        spike_limit_mib: 256
      resource:
        attributes:
          - key: cluster.name
            value: "production-us-east-1"
            action: upsert

    exporters:
      otlp/jaeger:
        endpoint: jaeger-collector.observability:4317
        tls:
          insecure: true
      otlp/tempo:
        endpoint: tempo.observability:4317
        tls:
          insecure: true
      prometheusremotewrite:
        endpoint: http://prometheus.observability:9090/api/v1/write

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, resource, batch]
          exporters: [otlp/jaeger, otlp/tempo]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.92.0
          args:
            - --config=/etc/otelcol-contrib/config.yaml
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8888
              name: metrics
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
    - name: metrics
      port: 8888
      targetPort: 8888
```

Note the `sidecar.istio.io/inject: "false"` annotation. You generally do not want an Istio sidecar on the Collector itself, as it can cause issues with the telemetry data path and create circular dependencies.

## Configuring Istio to Send Traces to the Collector

Register the Collector as an extension provider in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
          resource_detectors:
            - environment
```

Then activate tracing with a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10.0
      customTags:
        environment:
          literal:
            value: "production"
        cluster:
          literal:
            value: "us-east-1"
```

The `customTags` field adds extra attributes to every span, which is very useful for multi-cluster or multi-environment setups.

## Configuring Istio Access Logs to the Collector

Access logs can also go through the OTel Collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
      - name: otel-als
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

Then activate access logging:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logs
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-als
      filter:
        expression: "response.code >= 400 || connection.mtls == false"
```

On the Collector side, add a logs pipeline:

```yaml
service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]

exporters:
  loki:
    endpoint: http://loki.observability:3100/loki/api/v1/push
```

## Advanced Collector Processing

The Collector is not just a pass-through. You can do serious processing in the pipeline.

### Tail-Based Sampling

Instead of random sampling at the proxy level, you can do tail-based sampling in the Collector. This means the Collector sees the full trace and can make smarter decisions about which traces to keep:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      - name: errors-policy
        type: status_code
        status_code:
          status_codes:
            - ERROR
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 1000
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

This keeps all error traces and slow traces while randomly sampling 5% of the rest.

### Span Processing

You can modify spans as they flow through:

```yaml
processors:
  attributes:
    actions:
      - key: http.url
        action: hash
      - key: db.statement
        action: delete
      - key: environment
        value: production
        action: upsert
```

This hashes URLs (for privacy), removes database statements, and adds an environment tag.

## DaemonSet Deployment for High Volume

For large meshes, a central Collector can become a bottleneck. Deploy as a DaemonSet instead:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-agent
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector-agent
  template:
    metadata:
      labels:
        app: otel-collector-agent
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.92.0
          args:
            - --config=/etc/otelcol-contrib/config.yaml
          ports:
            - containerPort: 4317
              hostPort: 4317
              name: otlp-grpc
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 1Gi
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-agent-config
```

With a DaemonSet, each node has its own Collector, so the traffic stays local and the load distributes naturally.

## Monitoring the Collector Itself

The Collector exposes its own metrics on port 8888. Scrape them with Prometheus:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector-metrics
  namespace: observability
  labels:
    app: otel-collector
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8888"
spec:
  selector:
    app: otel-collector
  ports:
    - name: metrics
      port: 8888
```

Key metrics to monitor:

- `otelcol_receiver_accepted_spans` - Spans received successfully
- `otelcol_receiver_refused_spans` - Spans that were refused
- `otelcol_exporter_sent_spans` - Spans exported to backends
- `otelcol_processor_dropped_spans` - Spans dropped by processors
- `otelcol_exporter_queue_size` - Current export queue size

When `otelcol_exporter_queue_size` is growing, your backends cannot keep up with the volume.

## Troubleshooting

Common issues and their fixes:

```bash
# Check if the Collector is healthy
kubectl logs deploy/otel-collector -n observability | tail -20

# Verify OTLP endpoint is reachable from a proxy
kubectl exec deploy/my-app -c istio-proxy -- curl -v otel-collector.observability:4317

# Check Istio trace config
istioctl proxy-config bootstrap deploy/my-app -o json | jq '.bootstrap.tracing'

# Verify traces are being generated
kubectl logs deploy/my-app -c istio-proxy | grep "trace"
```

If traces are not appearing, the most common cause is a network policy blocking traffic from sidecars to the Collector. Make sure port 4317 is accessible.

The OpenTelemetry Collector paired with Istio gives you a flexible, vendor-neutral telemetry pipeline that can grow with your mesh. Start simple with a single Collector deployment and add processing stages as your needs evolve.
