# How to Set Up Custom Telemetry Providers in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Observability, OpenTelemetry, Kubernetes

Description: How to configure custom telemetry providers in Istio to send metrics, traces, and logs to your preferred backends.

---

Istio comes with built-in support for Prometheus metrics and Zipkin-style distributed tracing. But most production environments use a mix of monitoring tools. You might need to send traces to Jaeger, metrics to Datadog, and access logs to an OpenTelemetry Collector. Custom telemetry providers let you plug Istio into whatever observability stack your team uses.

Here is how to set up and configure custom telemetry providers in Istio.

## What Are Telemetry Providers?

A telemetry provider in Istio is a named configuration that defines where telemetry data (metrics, traces, or access logs) should be sent. Providers are defined in the Istio mesh configuration, and then referenced in Telemetry resources that control what data flows to which provider.

Think of providers as the "destinations" for your telemetry data. The Telemetry API resources are the "routing rules" that decide what data goes where.

## Defining Providers in MeshConfig

Providers are defined in the `extensionProviders` section of the mesh configuration. Here is an example that sets up multiple providers:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
      - name: custom-zipkin
        zipkin:
          service: zipkin.observability.svc.cluster.local
          port: 9411
      - name: skywalking
        skywalking:
          service: skywalking-oap.observability.svc.cluster.local
          port: 11800
      - name: otel-access-log
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
      - name: file-access-log
        envoyFileAccessLog:
          path: /dev/stdout
          logFormat:
            labels:
              source_name: "%REQ(X-ENVOY-PEER-METADATA-ID)%"
              destination_name: "%UPSTREAM_CLUSTER%"
              response_code: "%RESPONSE_CODE%"
              duration: "%DURATION%"
```

Each provider has a unique name and a type-specific configuration block. The supported provider types are:

- **prometheus** - Built-in Prometheus metrics
- **opentelemetry** - OpenTelemetry protocol (OTLP) for traces
- **zipkin** - Zipkin trace format
- **skywalking** - Apache SkyWalking
- **envoyOtelAls** - Envoy OpenTelemetry Access Log Service
- **envoyFileAccessLog** - File-based access logging
- **envoyHttpAls** - HTTP-based access log service
- **envoyTcpAls** - TCP-based access log service

## Setting Up an OpenTelemetry Trace Provider

The most common custom provider is an OpenTelemetry Collector for tracing. Here is a complete setup:

First, deploy the OTel Collector:

```yaml
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
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.92.0
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
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
```

Then configure the collector:

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
    processors:
      batch:
        timeout: 5s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
    exporters:
      otlp:
        endpoint: jaeger.observability:4317
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
```

Now define the provider in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

And activate it with a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 10.0
```

## Setting Up a Custom Access Log Provider

Access logs are incredibly useful for debugging. Here is how to set up OTel-based access logging:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-access-log
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

Activate it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: otel-access-log
      filter:
        expression: "response.code >= 400"
```

The `filter` field with a CEL expression is powerful. In this example, only error responses get logged, which keeps the volume manageable.

## Using Multiple Providers

You can send telemetry to multiple providers simultaneously. This is useful during migrations or when different teams use different tools:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: multi-provider
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing
        - name: custom-zipkin
      randomSamplingPercentage: 5.0
  accessLogging:
    - providers:
        - name: otel-access-log
        - name: file-access-log
```

Each provider receives the same telemetry data independently.

## Namespace-Scoped Provider Overrides

Different namespaces can use different providers or different settings:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-tracing
  namespace: staging
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 100.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: prod-tracing
  namespace: production
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 1.0
```

Staging gets 100% trace sampling for full visibility during testing, while production gets 1% to minimize overhead.

## Verifying Provider Configuration

After setting up providers, verify everything is working:

```bash
# Check mesh config has the providers
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep extensionProviders -A 20

# Check that proxies are sending data
kubectl logs deploy/my-service -c istio-proxy | grep "otel\|trace\|access_log"

# Verify the Telemetry resource is applied
istioctl analyze -n istio-system

# Check OTel Collector is receiving data
kubectl logs deploy/otel-collector -n observability | grep "TracesExporter"
```

## Common Issues

A few things that cause problems with custom providers:

- **DNS resolution** - The provider service must be resolvable from the proxy. Use the full `svc.cluster.local` name
- **Port mismatch** - Make sure the port in the provider config matches the actual service port
- **Protocol mismatch** - OpenTelemetry uses gRPC by default. If your collector only accepts HTTP, you need to adjust the config
- **Network policies** - If you have NetworkPolicy resources, make sure the sidecar proxies can reach the collector service

Custom telemetry providers give you the flexibility to send Istio telemetry data exactly where it needs to go. Once you get the provider architecture, adding new backends is just a matter of defining a new provider and creating a Telemetry resource to route data to it.
