# How to Configure OTLP Exporter in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OTLP, OpenTelemetry, Exporter, Kubernetes, Tracing

Description: How to configure the OTLP exporter in Istio for sending telemetry data to any OpenTelemetry-compatible backend using gRPC or HTTP protocols.

---

OTLP (OpenTelemetry Protocol) is the native data transport protocol for OpenTelemetry. When you configure Istio to export telemetry via OTLP, every Envoy sidecar in your mesh sends trace spans directly to an OTLP-compatible endpoint. This is the most direct and efficient way to get Istio telemetry into an OpenTelemetry pipeline. The exporter configuration controls where the data goes, how it's sent, and what happens when the destination is unavailable.

## OTLP Protocol Basics

OTLP supports two transport mechanisms:

- **gRPC** (port 4317 by convention) - binary protocol, efficient for high-volume telemetry
- **HTTP/protobuf** (port 4318 by convention) - HTTP-based, easier to route through load balancers and proxies

Istio's built-in OTLP exporter uses gRPC. If you need HTTP, you can route through an OpenTelemetry Collector that bridges the two.

## Basic OTLP Exporter Configuration

Configure Istio to export traces via OTLP:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: otel
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel
```

```bash
istioctl install -f istio-otlp.yaml
```

Every new sidecar will now send traces to `otel-collector.observability:4317` using OTLP/gRPC.

Restart existing workloads to pick up the change:

```bash
kubectl rollout restart deployment -n default
```

## Verifying the OTLP Exporter

Confirm that sidecars are exporting traces:

```bash
# Check Envoy tracing stats
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /stats | grep tracing

# You should see counters like:
# tracing.opentelemetry.spans_sent: 42
# tracing.opentelemetry.spans_dropped: 0
```

If `spans_sent` is increasing, the exporter is working. If `spans_dropped` is increasing, the collector might be unreachable.

## Configuring Sampling Rate

Control how many requests generate traces:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 5.0
    extensionProviders:
    - name: otel
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel
```

The `sampling` value is a percentage. 5.0 means 5% of requests get traced. The sampling decision is made at the ingress point and propagated through context headers so that all services in a trace chain agree on whether to sample.

## Per-Service Exporter Configuration with Telemetry API

The Telemetry API lets you configure different settings per namespace or workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 1.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: high-value-tracing
  namespace: payments
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 25.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-tracing
  namespace: staging
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 100.0
```

## Multiple OTLP Exporters

You can define multiple OTLP exporter endpoints and use them for different purposes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: otel-primary
      opentelemetry:
        service: otel-collector-primary.observability.svc.cluster.local
        port: 4317
    - name: otel-secondary
      opentelemetry:
        service: otel-collector-secondary.observability.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-primary
```

Then use the Telemetry API to assign different providers to different workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: special-tracing
  namespace: analytics
spec:
  tracing:
  - providers:
    - name: otel-secondary
    randomSamplingPercentage: 50.0
```

## OTLP Exporter for Access Logs

Istio can also send access logs via OTLP using the Envoy OpenTelemetry Access Log Service:

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
    defaultProviders:
      tracing:
      - otel
      accessLogging:
      - otel-als
```

Access logs sent via OTLP include request-level details like method, path, response code, duration, and source/destination information.

## Controlling Exported Span Attributes

Add custom attributes to all exported spans:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: enriched-spans
  namespace: default
spec:
  tracing:
  - providers:
    - name: otel
    customTags:
      environment:
        literal:
          value: "production"
      region:
        literal:
          value: "us-east-1"
      user_agent:
        header:
          name: user-agent
          defaultValue: "unknown"
      correlation_id:
        header:
          name: x-correlation-id
```

## Connection and Retry Behavior

When the OTLP endpoint is unavailable, Envoy handles it gracefully. Spans are buffered briefly and then dropped if the endpoint stays down. The proxy does not queue unlimited data to avoid memory issues.

You can monitor connection health through Envoy stats:

```bash
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /stats | grep -E "grpc.*otel|tracing"
```

For more control over retry and buffering behavior, put an OpenTelemetry Collector between Istio and your backend. The collector has configurable retry policies:

```yaml
exporters:
  otlp:
    endpoint: "backend.example.com:4317"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

## TLS Configuration

For production deployments, encrypt the OTLP connection:

When sending to a collector within the mesh, Istio's mTLS handles encryption automatically. For collectors outside the mesh, the collector needs to be configured with TLS:

```yaml
# Collector receiver with TLS
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          cert_file: /etc/certs/server.crt
          key_file: /etc/certs/server.key
          client_ca_file: /etc/certs/ca.crt
```

If your collector is inside the mesh with mTLS enabled, the sidecar handles encryption and you don't need to configure TLS on the collector.

## Troubleshooting OTLP Export

When traces aren't arriving at the backend:

```bash
# Step 1: Check if the proxy is sending spans
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /stats | grep tracing

# Step 2: Check connectivity to the collector
kubectl exec $POD -c istio-proxy -- curl -v otel-collector.observability:4317

# Step 3: Check collector is receiving data
kubectl logs -n observability -l app=otel-collector --tail=20

# Step 4: Check the extension provider config
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 5 extensionProviders

# Step 5: Verify the Telemetry resource
kubectl get telemetry -A

# Step 6: Check for DNS resolution issues
kubectl exec $POD -c istio-proxy -- nslookup otel-collector.observability
```

Common issues:

- **Wrong service name** in the extension provider (must be a fully qualified service name)
- **Port mismatch** between the provider config and the collector's listening port
- **Sampling rate at 0** so no traces are generated
- **Pod hasn't been restarted** after changing mesh configuration
- **Network policy** blocking traffic to the collector namespace

## Performance Impact

The OTLP exporter adds minimal overhead to each request:

- Span creation: ~1-2 microseconds per span
- gRPC export: batched, so the per-request cost is negligible
- Memory: small buffer for pending spans (~10KB typical)

The main performance lever is the sampling rate. At 100% sampling with high traffic, the export overhead becomes noticeable. For production, keep sampling between 0.1% and 10% depending on your traffic volume and observability needs.

The OTLP exporter in Istio is straightforward to configure and provides a clean path for getting mesh telemetry into any OpenTelemetry-compatible backend. Start with a simple configuration, verify data is flowing, then layer on custom tags, per-service sampling, and access log export as your needs grow.
