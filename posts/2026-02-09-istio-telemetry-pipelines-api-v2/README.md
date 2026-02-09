# How to Build Custom Istio Telemetry Pipelines Using the Telemetry API v2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Telemetry, Observability, Prometheus, OpenTelemetry

Description: Learn how to create custom telemetry pipelines in Istio using the Telemetry API v2 to control metrics, traces, and access logs with fine-grained configuration for specific workloads.

---

Istio generates vast amounts of telemetry data by default, but you don't always need every metric or trace. The Telemetry API v2 gives you precise control over what data Istio collects and where it sends that data. This guide shows you how to build custom telemetry pipelines that fit your observability needs.

## Understanding the Telemetry API v2

The Telemetry API v2 replaces the older Mixer-based telemetry architecture with a more efficient Envoy-native approach. Instead of sending every metric through an external Mixer component, proxies generate telemetry directly and send it to configured backends.

You can configure telemetry at three levels: mesh-wide in the IstioOperator, namespace-wide with Telemetry resources, or workload-specific using selector labels. More specific configurations override broader ones, giving you fine-grained control.

The API controls three telemetry types: metrics (Prometheus-style), traces (distributed tracing), and access logs (request-level logging). You can configure each independently.

## Prerequisites

You need a Kubernetes cluster with Istio 1.11 or later installed. The Telemetry API v2 is the default in recent versions. Verify your Istio installation:

```bash
istioctl version
kubectl get pods -n istio-system
```

Deploy sample applications for testing:

```yaml
# sample-apps.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        version: v1
    spec:
      containers:
      - name: frontend
        image: your-registry/frontend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: default
spec:
  selector:
    app: frontend
  ports:
  - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        version: v1
    spec:
      containers:
      - name: backend
        image: your-registry/backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
spec:
  selector:
    app: backend
  ports:
  - port: 8080
```

```bash
kubectl apply -f sample-apps.yaml
```

## Customizing Metrics Collection

By default, Istio collects a standard set of metrics. Create a Telemetry resource to customize which metrics to collect:

```yaml
# telemetry-custom-metrics.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  metrics:
  - providers:
    - name: prometheus
    # Add custom dimensions to metrics
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        custom_label:
          value: "my-custom-value"
    # Disable specific metrics
    - match:
        metric: REQUEST_COUNT
        mode: CLIENT
      disabled: true
```

```bash
kubectl apply -f telemetry-custom-metrics.yaml
```

This configuration adds a custom label to all metrics and disables client-side request count metrics. Verify by checking Prometheus:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

Query for your custom label:

```promql
istio_requests_total{custom_label="my-custom-value"}
```

## Creating Workload-Specific Metrics Configuration

Apply different metric configurations to specific workloads using selectors:

```yaml
# telemetry-workload-metrics.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: backend-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  metrics:
  - providers:
    - name: prometheus
    overrides:
    # Add response size histogram for backend only
    - match:
        metric: RESPONSE_SIZE
      tagOverrides:
        app:
          value: "backend"
    # Increase metric cardinality for backend
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        request_path:
          value: "request.url_path"
```

```bash
kubectl apply -f telemetry-workload-metrics.yaml
```

Now only backend pods report metrics with the request path dimension. This prevents metric explosion on high-cardinality dimensions for services that don't need them.

## Configuring Custom Access Logs

Access logs show request-level details. By default, Istio doesn't enable access logging because it generates significant data. Enable it selectively:

```yaml
# telemetry-access-logs.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: access-logs
  namespace: default
spec:
  accessLogging:
  - providers:
    - name: envoy
    # Custom log format with specific fields
    filter:
      expression: "response.code >= 400"
```

```bash
kubectl apply -f telemetry-access-logs.yaml
```

This enables access logging only for requests with error status codes (400+). Check pod logs:

```bash
kubectl logs -l app=frontend -c istio-proxy --tail=20
```

You'll see access log entries for failed requests.

## Creating a JSON-Formatted Access Log Pipeline

Send access logs in JSON format for better parsing by log aggregators:

```yaml
# telemetry-json-access-logs.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: json-access-logs
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  accessLogging:
  - providers:
    - name: envoy
    # Custom JSON format
    match:
      mode: CLIENT_AND_SERVER
    # Define custom log format
    format:
      labels:
        timestamp: "%START_TIME%"
        method: "%REQ(:METHOD)%"
        path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
        protocol: "%PROTOCOL%"
        response_code: "%RESPONSE_CODE%"
        duration: "%DURATION%"
        user_agent: "%REQ(USER-AGENT)%"
        request_id: "%REQ(X-REQUEST-ID)%"
```

```bash
kubectl apply -f telemetry-json-access-logs.yaml
```

Now frontend pods output structured JSON logs that are easier to parse and analyze.

## Configuring Distributed Tracing

Enable distributed tracing to track requests across services. Configure trace sampling rates and exporters:

```yaml
# telemetry-tracing.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: default
spec:
  tracing:
  - providers:
    - name: jaeger
    # Sample 10% of requests
    randomSamplingPercentage: 10.0
    # Add custom tags to traces
    customTags:
      environment:
        literal:
          value: "production"
      service_version:
        environment:
          name: SERVICE_VERSION
```

```bash
kubectl apply -f telemetry-tracing.yaml
```

This sends 10% of traces to Jaeger with custom tags. Configure the Jaeger provider in your Istio installation:

```yaml
# istio-tracing-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-tracing
  namespace: istio-system
spec:
  meshConfig:
    extensionProviders:
    - name: jaeger
      opentelemetry:
        service: jaeger-collector.observability.svc.cluster.local
        port: 9411
```

Apply with istioctl:

```bash
istioctl install -f istio-tracing-config.yaml
```

## Creating a Multi-Provider Telemetry Pipeline

Send telemetry to multiple backends simultaneously. For example, send metrics to both Prometheus and a custom aggregator:

```yaml
# telemetry-multi-provider.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: multi-provider
  namespace: default
spec:
  metrics:
  # Send to Prometheus
  - providers:
    - name: prometheus
  # Send to custom OTEL collector
  - providers:
    - name: otel-collector
```

Define the custom provider in your mesh configuration:

```yaml
# istio-custom-provider.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-custom
  namespace: istio-system
spec:
  meshConfig:
    extensionProviders:
    - name: otel-collector
      opentelemetry:
        service: opentelemetry-collector.observability.svc.cluster.local
        port: 4317
```

Now telemetry flows to both backends. This is useful for sending data to both internal monitoring and external SaaS platforms.

## Reducing Metric Cardinality

High-cardinality metrics consume excessive memory and storage. Reduce cardinality by disabling unnecessary dimensions:

```yaml
# telemetry-low-cardinality.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: low-cardinality
  namespace: default
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    # Remove high-cardinality labels
    - match:
        metric: ALL_METRICS
      tagOverrides:
        source_workload_namespace:
          operation: REMOVE
        destination_workload_namespace:
          operation: REMOVE
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
```

```bash
kubectl apply -f telemetry-low-cardinality.yaml
```

This removes several labels that increase cardinality. Your metric storage requirements drop significantly.

## Configuring Namespace-Level Telemetry Inheritance

Create a namespace-wide configuration that applies to all workloads:

```yaml
# telemetry-namespace-default.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: namespace-default
  namespace: production
spec:
  # Enable tracing for all production services
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 100.0
  # Enable access logs for all production services
  accessLogging:
  - providers:
    - name: envoy
```

```bash
kubectl apply -f telemetry-namespace-default.yaml -n production
```

Individual workloads can override this with more specific Telemetry resources.

## Creating Conditional Access Logs with CEL Expressions

Use Common Expression Language (CEL) filters to log only interesting requests:

```yaml
# telemetry-conditional-logs.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: conditional-logs
  namespace: default
spec:
  accessLogging:
  - providers:
    - name: envoy
    # Log only slow requests or errors
    filter:
      expression: "response.duration > 1000 || response.code >= 500"
```

```bash
kubectl apply -f telemetry-conditional-logs.yaml
```

This logs requests that take over 1 second or return 5xx errors. It dramatically reduces log volume while capturing problematic requests.

## Disabling Telemetry for Specific Workloads

Some workloads don't need telemetry, like internal health checkers or test pods. Disable it completely:

```yaml
# telemetry-disabled.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: telemetry-disabled
  namespace: default
spec:
  selector:
    matchLabels:
      telemetry: disabled
  metrics:
  - providers:
    - name: prometheus
    disabled: true
  tracing:
  - disabled: true
  accessLogging:
  - disabled: true
```

```bash
kubectl apply -f telemetry-disabled.yaml
```

Label pods that don't need telemetry:

```yaml
metadata:
  labels:
    telemetry: disabled
```

## Monitoring Telemetry Pipeline Performance

Telemetry collection has overhead. Monitor the cost using Envoy admin interface:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl http://localhost:15000/stats/prometheus | grep envoy_cluster_upstream_rq
```

Check memory usage of the Envoy proxy:

```bash
kubectl top pods -l app=frontend --containers
```

The istio-proxy container shows telemetry overhead. Optimize by disabling unnecessary metrics or reducing sampling rates.

## Creating a Telemetry Dashboard

Export custom metrics and visualize them in Grafana. Add business-level metrics:

```yaml
# telemetry-business-metrics.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: business-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment-service
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        payment_method:
          value: "request.headers['x-payment-method']"
        customer_tier:
          value: "request.headers['x-customer-tier']"
```

Query these in Prometheus:

```promql
# Requests by payment method
sum by (payment_method) (
  rate(istio_requests_total{app="payment-service"}[5m])
)
```

## Conclusion

The Istio Telemetry API v2 gives you precise control over observability data collection. You can enable metrics, traces, and logs at mesh, namespace, or workload level with custom configurations for each.

Use selectors to apply different telemetry settings to different services. Reduce overhead by disabling unnecessary metrics, sampling traces, and filtering access logs. Send data to multiple backends for different use cases.

Start with the default telemetry configuration, then customize as you understand your observability needs. Use CEL expressions for conditional logging and add custom dimensions to metrics that matter for your business. This approach gives you the insights you need without drowning in unnecessary telemetry data.
