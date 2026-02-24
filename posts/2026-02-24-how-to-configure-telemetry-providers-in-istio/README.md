# How to Configure Telemetry Providers in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Prometheus, Zipkin, OpenTelemetry, Observability

Description: How to configure and manage telemetry providers in Istio for metrics, tracing, and logging including Prometheus, Zipkin, Jaeger, and OpenTelemetry.

---

Istio supports multiple telemetry backends for metrics, tracing, and logging. You can send your metrics to Prometheus, your traces to Jaeger or Zipkin, and your logs to stdout or an external logging service. Configuring these providers correctly is essential for getting the observability data you need in the format and location that works for your infrastructure.

## Understanding Telemetry Providers

A telemetry provider in Istio is a backend that receives and stores telemetry data. Istio supports different providers for each type of telemetry:

**Metrics providers**: Prometheus (default), Stackdriver/Google Cloud Monitoring
**Tracing providers**: Zipkin, Jaeger, OpenTelemetry, Datadog, Lightstep, Stackdriver
**Logging providers**: Envoy (stdout), OpenTelemetry, Stackdriver

You configure providers in two places:
1. The mesh configuration (IstioOperator) for defining available providers
2. The Telemetry resource for selecting which providers to use

## Configuring Prometheus for Metrics

Prometheus is the default metrics provider. The basic configuration is:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
        - ".*circuit_breakers.*"
        - ".*upstream_rq_retry.*"
```

`enablePrometheusMerge` merges application metrics and sidecar metrics on a single endpoint (port 15020). This simplifies Prometheus scraping because you only need to scrape one endpoint per pod.

`proxyStatsMatcher` controls which Envoy-native stats are exposed to Prometheus. By default, only the Istio standard metrics are exposed. If you need Envoy-specific stats (like circuit breaker counters), you need to add them to the inclusion list.

### Customizing Prometheus Metric Labels

Use the Telemetry API to customize which labels are included in your metrics:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: CLIENT_AND_SERVER
      tagOverrides:
        request_host:
          operation: REMOVE
        destination_port:
          operation: REMOVE
    - match:
        metric: REQUEST_DURATION
      tagOverrides:
        response_code:
          operation: REMOVE
```

This removes specific labels from specific metrics, which reduces cardinality and storage costs.

## Configuring Zipkin for Tracing

To use Zipkin as your tracing backend:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: zipkin
      zipkin:
        service: zipkin.istio-system.svc.cluster.local
        port: 9411
    defaultConfig:
      tracing:
        sampling: 1.0
```

Deploy Zipkin:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/extras/zipkin.yaml
```

Then configure it via the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 5.0
```

Access the Zipkin UI:

```bash
kubectl port-forward svc/zipkin -n istio-system 9411:9411
```

Then open `http://localhost:9411` in your browser.

## Configuring Jaeger for Tracing

Jaeger is another popular tracing backend. The configuration is similar:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: jaeger
      zipkin:
        service: jaeger-collector.istio-system.svc.cluster.local
        port: 9411
```

Note that Jaeger accepts Zipkin-format traces on port 9411, so the configuration uses the `zipkin` provider type.

Deploy Jaeger:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

Access the Jaeger UI:

```bash
istioctl dashboard jaeger
```

## Configuring OpenTelemetry

OpenTelemetry is the modern, vendor-neutral standard for telemetry. Istio supports sending traces and logs to an OpenTelemetry Collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    - name: otel-logging
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
        logging: {}
```

Deploy the OpenTelemetry Collector:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 8889
          name: prometheus
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
  namespace: istio-system
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
  - name: prometheus
    port: 8889
```

Configure the collector to export to your backends:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
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
        send_batch_size: 1000

    exporters:
      prometheus:
        endpoint: 0.0.0.0:8889
      jaeger:
        endpoint: jaeger-collector.istio-system.svc:14250
        tls:
          insecure: true
      logging:
        loglevel: info

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [jaeger, logging]
        metrics:
          receivers: [otlp]
          processors: [batch]
          exporters: [prometheus]
```

Then enable the provider:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: otel-config
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10.0
```

## Configuring Access Logging Providers

### Envoy stdout (default)

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: logging-config
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

### OpenTelemetry for logging

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: otel-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: otel-logging
```

## Per-Namespace and Per-Workload Configuration

You can override telemetry configuration at the namespace or workload level:

```yaml
# Namespace-level: increase tracing for staging namespace
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: staging-telemetry
  namespace: staging
spec:
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 50.0
---
# Workload-level: disable access logging for noisy service
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: noisy-service-telemetry
  namespace: default
spec:
  selector:
    matchLabels:
      app: noisy-service
  accessLogging:
  - providers:
    - name: envoy
    disabled: true
```

The hierarchy is: workload-level > namespace-level > mesh-level (istio-system).

## Verifying Provider Configuration

Check that providers are configured correctly:

```bash
# Check mesh config for providers
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 10 extensionProviders

# Check if a sidecar is sending traces
kubectl logs deploy/my-app -c istio-proxy | grep -i "trace\|zipkin\|otel"

# Verify Telemetry resources
kubectl get telemetry --all-namespaces

# Check Envoy stats for trace reporting
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep tracing
```

## Multiple Providers

You can send telemetry to multiple providers simultaneously:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: multi-provider
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: zipkin
    - name: otel-tracing
    randomSamplingPercentage: 5.0
  metrics:
  - providers:
    - name: prometheus
  accessLogging:
  - providers:
    - name: envoy
    - name: otel-logging
```

Traces go to both Zipkin and OpenTelemetry, metrics go to Prometheus, and access logs go to both stdout and OpenTelemetry.

Choosing and configuring the right telemetry providers depends on your existing infrastructure and observability stack. Prometheus and Zipkin/Jaeger are the easiest to start with using Istio's sample addons. OpenTelemetry gives you the most flexibility because you can route telemetry to virtually any backend through the collector's export pipeline. Start simple, verify data is flowing, and expand from there.
