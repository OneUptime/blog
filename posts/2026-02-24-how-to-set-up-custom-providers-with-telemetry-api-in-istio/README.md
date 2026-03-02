# How to Set Up Custom Providers with Telemetry API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, OpenTelemetry, Custom Provider, Observability

Description: How to configure custom telemetry providers in Istio including OpenTelemetry Collectors, custom access log formats, and external tracing backends.

---

Istio's built-in telemetry providers (Prometheus for metrics, Envoy for logging, Zipkin for tracing) cover the basics. But production environments often need custom providers - maybe you're sending traces to Datadog, metrics to an OpenTelemetry Collector, or access logs in a specific JSON format to a centralized logging system.

The Telemetry API references providers by name, and those providers are defined in the Istio MeshConfig. This post covers how to define custom providers for each telemetry type and wire them into your Telemetry resources.

## Where Providers Are Defined

Providers live in the MeshConfig's `extensionProviders` section. You can edit MeshConfig through the `istio` ConfigMap in the `istio-system` namespace:

```bash
kubectl edit configmap istio -n istio-system
```

Or if you installed Istio with IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: my-provider
        # provider-specific config
```

After changing MeshConfig, restart istiod:

```bash
kubectl rollout restart deployment istiod -n istio-system
```

Then restart your workloads to pick up the new provider:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Custom Access Log Providers

### JSON File Access Log

The default Envoy access log uses a text format that's hard to parse. A JSON provider is much better for log aggregation:

```yaml
extensionProviders:
  - name: json-file-log
    envoyFileAccessLog:
      path: "/dev/stdout"
      logFormat:
        labels:
          timestamp: "%START_TIME%"
          source_address: "%DOWNSTREAM_REMOTE_ADDRESS%"
          destination: "%UPSTREAM_HOST%"
          method: "%REQ(:METHOD)%"
          path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
          protocol: "%PROTOCOL%"
          status_code: "%RESPONSE_CODE%"
          response_flags: "%RESPONSE_FLAGS%"
          bytes_received: "%BYTES_RECEIVED%"
          bytes_sent: "%BYTES_SENT%"
          duration_ms: "%DURATION%"
          upstream_time_ms: "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%"
          request_id: "%REQ(X-REQUEST-ID)%"
          user_agent: "%REQ(USER-AGENT)%"
          authority: "%REQ(:AUTHORITY)%"
          upstream_cluster: "%UPSTREAM_CLUSTER%"
          source_workload: "%ENVIRONMENT(SOURCE_WORKLOAD)%"
```

Use it in a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: json-file-log
```

### OpenTelemetry Access Log Provider

Send access logs to an OpenTelemetry Collector using the ALS (Access Log Service) protocol:

```yaml
extensionProviders:
  - name: otel-als
    envoyOtelAls:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
      logFormat:
        labels:
          source_workload: "%ENVIRONMENT(SOURCE_WORKLOAD)%"
          destination_service: "%REQ(:AUTHORITY)%"
          response_code: "%RESPONSE_CODE%"
```

### gRPC Access Log Service

If you have a custom ALS receiver:

```yaml
extensionProviders:
  - name: custom-als
    envoyExtAuthzGrpc:
      service: als-receiver.observability.svc.cluster.local
      port: 9999
```

## Custom Tracing Providers

### Zipkin-Compatible Provider

For any backend that accepts Zipkin format (Jaeger, Tempo, etc.):

```yaml
extensionProviders:
  - name: jaeger
    zipkin:
      service: jaeger-collector.observability.svc.cluster.local
      port: 9411
```

### OpenTelemetry Tracing Provider

For backends that accept OTLP:

```yaml
extensionProviders:
  - name: otel-tracing
    opentelemetry:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
```

### Sending to Multiple Trace Backends

You can define multiple trace providers and use them simultaneously:

```yaml
extensionProviders:
  - name: jaeger
    zipkin:
      service: jaeger-collector.observability.svc.cluster.local
      port: 9411
  - name: otel-collector
    opentelemetry:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
```

Then in your Telemetry resource, reference both:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: jaeger
      randomSamplingPercentage: 1.0
    - providers:
        - name: otel-collector
      randomSamplingPercentage: 100.0
```

This sends 1% of traces to Jaeger and 100% to the OTel Collector (which might have its own sampling logic).

## Setting Up an OpenTelemetry Collector

Since the OTel Collector is the most versatile provider, here's a complete setup:

### Deploy the Collector

```yaml
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
      zipkin:
        endpoint: 0.0.0.0:9411
    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
        spike_limit_mib: 128
    exporters:
      otlp/jaeger:
        endpoint: "jaeger-collector.observability:4317"
        tls:
          insecure: true
      debug:
        verbosity: detailed
    service:
      pipelines:
        traces:
          receivers: [otlp, zipkin]
          processors: [memory_limiter, batch]
          exporters: [otlp/jaeger]
        logs:
          receivers: [otlp]
          processors: [batch]
          exporters: [debug]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.93.0
          args:
            - "--config=/etc/otelcol/config.yaml"
          ports:
            - containerPort: 4317
              name: grpc-otlp
            - containerPort: 4318
              name: http-otlp
            - containerPort: 9411
              name: zipkin
          resources:
            limits:
              memory: 1Gi
              cpu: "1"
            requests:
              memory: 256Mi
              cpu: 250m
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol
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
    - name: grpc-otlp
      port: 4317
      targetPort: 4317
    - name: http-otlp
      port: 4318
      targetPort: 4318
    - name: zipkin
      port: 9411
      targetPort: 9411
```

### Register as Istio Provider

```yaml
extensionProviders:
  - name: otel
    opentelemetry:
      service: otel-collector.observability.svc.cluster.local
      port: 4317
```

### Use in Telemetry

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 5.0
      customTags:
        mesh:
          literal:
            value: "production"
```

## Using Multiple Providers Simultaneously

A powerful pattern is using different providers for different purposes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  # Send all access logs to stdout in JSON
  accessLogging:
    - providers:
        - name: json-file-log
    # Also send error logs to OTel collector
    - providers:
        - name: otel-als
      filter:
        expression: "response.code >= 500"
  # Metrics to Prometheus (default)
  metrics:
    - providers:
        - name: prometheus
  # Traces to OTel Collector
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 5.0
```

## Verifying Custom Providers

### Check MeshConfig

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A 5 "extensionProviders"
```

### Verify Provider Connectivity

Check that istiod can reach the provider endpoints:

```bash
kubectl logs -n istio-system -l app=istiod | grep -i "extension"
```

### Test with a Single Pod

Before rolling out mesh-wide, test on a single workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: test-provider
  namespace: test
spec:
  selector:
    matchLabels:
      app: test-service
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 100.0
```

Generate traffic and check if traces arrive at the OTel Collector:

```bash
kubectl logs -n observability -l app=otel-collector | grep "traces"
```

## Troubleshooting

**Provider silently does nothing**: The provider name in MeshConfig must exactly match the name in the Telemetry resource. Check for typos.

**Connection refused errors**: Verify the provider service is reachable from the istio-proxy containers. Test with:

```bash
kubectl exec -it <pod> -c istio-proxy -- curl -v http://otel-collector.observability:4317
```

**Traces not appearing**: After updating MeshConfig, you need to restart both istiod and workload pods. The provider config is pushed via xDS and needs a fresh connection.

Custom providers unlock the full potential of Istio's telemetry system. Whether you're sending data to a commercial observability platform or building a custom pipeline with OpenTelemetry, the provider model keeps your Telemetry resources clean and the plumbing configurable.
