# How to Use Service Mesh Observability with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Observability, Service Mesh, Tracing, Metric

Description: Learn how to combine Dapr's built-in observability with service mesh telemetry for complete visibility into microservice communication.

---

Dapr and service meshes like Istio each generate telemetry data for the traffic they handle. Combining both gives you a complete picture: Dapr provides application-level metrics and traces, while the service mesh adds network-level latency, error rates, and mTLS status. This guide shows how to unify both sources.

## Dapr's Built-In Observability

Dapr automatically generates metrics, logs, and distributed traces without any code changes:

- **Metrics**: Exposed on port 9090 in Prometheus format
- **Traces**: W3C Trace Context propagated via HTTP headers
- **Logs**: Structured JSON logs from the sidecar

Configure a Zipkin exporter:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://jaeger-collector:9411/api/v2/spans
```

## Istio Telemetry Configuration

Configure Istio to export metrics to the same Prometheus instance:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 100
```

## Correlate Dapr and Mesh Traces

Dapr propagates W3C `traceparent` headers, which Istio's Envoy proxy also respects. When both are configured to send to the same Jaeger instance, traces from both layers appear in the same trace:

```bash
# Search Jaeger for traces that include both dapr and envoy spans
curl "http://jaeger:16686/api/traces?service=order-service&limit=20"
```

In the trace view, you will see spans from:
- Your application code
- Dapr sidecar operations (state, pub/sub, invocation)
- Envoy proxy (network latency, TLS handshake)

## Build a Unified Grafana Dashboard

Create a Grafana dashboard that combines Dapr and Istio metrics:

```yaml
# Example PromQL queries for a combined dashboard

# Dapr service invocation success rate
sum(rate(dapr_runtime_service_invocation_res_recv_total{status="200"}[5m])) /
sum(rate(dapr_runtime_service_invocation_res_recv_total[5m]))

# Istio request success rate
sum(rate(istio_requests_total{response_code="200"}[5m])) /
sum(rate(istio_requests_total[5m]))

# Combined p99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service_name))
```

## Monitor mTLS Status

Use Istio metrics to verify all Dapr traffic is encrypted:

```bash
# Check for unencrypted connections
kubectl exec <pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "ssl.no_certificate"
```

Kiali also shows mTLS status per service edge in its graph view.

## Set Up Alerting

Configure Prometheus alerts combining both Dapr and mesh metrics:

```yaml
groups:
- name: dapr-mesh-alerts
  rules:
  - alert: DaprHighErrorRate
    expr: |
      sum(rate(dapr_runtime_service_invocation_res_recv_total{status!="200"}[5m])) /
      sum(rate(dapr_runtime_service_invocation_res_recv_total[5m])) > 0.05
    for: 2m
    labels:
      severity: warning
```

## Summary

Combining Dapr's application-level observability with service mesh telemetry provides complete visibility from application logic down to the network layer. Configure both systems to export to the same Jaeger and Prometheus instances, correlate traces using W3C trace context propagation, and build unified Grafana dashboards that surface both application and network-level signals in one view.
