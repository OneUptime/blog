# How to Monitor Dapr Network Latency Between Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Network, Latency, Observability, Tracing

Description: Learn how to monitor network latency between Dapr services using distributed tracing, Prometheus metrics, and dashboards to diagnose slow service calls.

---

## Understanding Latency Sources in Dapr

When Service A calls Service B through Dapr, the request passes through the local Dapr sidecar, across the network to Service B's sidecar, and then to Service B. Each hop adds latency. Monitoring each segment helps pinpoint where slowness originates.

## Enabling Distributed Tracing

Configure both services with the same tracing configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin.monitoring:9411/api/v2/spans
```

Apply to each deployment:

```bash
kubectl annotate deployment service-a dapr.io/config=tracing
kubectl annotate deployment service-b dapr.io/config=tracing
```

## Prometheus Metrics for Service Invocation

Dapr exposes service invocation metrics including `dapr_runtime_service_invocation_req_sent_total` (request count) and `dapr_http_client_roundtrip_latency` (latency histogram). To query p99 latency:

```bash
# P99 service invocation latency
histogram_quantile(0.99,
  sum by (le) (
    rate(dapr_http_client_roundtrip_latency_bucket[5m])
  )
)
```

You can also break it down by target:

```bash
histogram_quantile(0.95,
  sum by (app_id, le) (
    rate(dapr_http_client_roundtrip_latency_bucket[5m])
  )
)
```

## Sample Go Service Invocation

Call a downstream service and measure elapsed time in your application code for correlation:

```go
start := time.Now()
resp, err := client.InvokeMethod(ctx, "service-b", "process", "GET")
elapsed := time.Since(start)
log.Printf("service-b invocation took %dms", elapsed.Milliseconds())
```

## Grafana Dashboard Setup

Import the official Dapr Grafana dashboard or build a custom one. Download the dashboard JSON from the Dapr repository and import it via the Grafana UI (Dashboards > Import):

```bash
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json
```

Key panels to add:
- Service invocation request rate
- P50/P95/P99 latency per app pair
- Error rate by target service

## Identifying High-Latency Routes

Use Jaeger or Zipkin to find slow traces:

```bash
# Port-forward Zipkin
kubectl port-forward svc/zipkin 9411:9411 -n monitoring

# Then open http://localhost:9411 and filter by service name
```

Look for traces where the span from sidecar to sidecar is significantly longer than the application processing time.

## Alerting on Latency Thresholds

Create a PrometheusRule to alert when p99 latency exceeds 500ms:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-latency-alert
spec:
  groups:
    - name: dapr.rules
      rules:
        - alert: DaprHighServiceLatency
          expr: |
            histogram_quantile(0.99,
              sum by (le) (
                rate(dapr_http_client_roundtrip_latency_bucket[5m])
              )
            ) > 500
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Dapr service latency exceeds 500ms"
```

## Summary

Monitoring Dapr network latency between services requires enabling distributed tracing, scraping Prometheus histograms for invocation duration, and building Grafana dashboards to visualize p95/p99 latency per service pair. Setting up PrometheusRule alerts ensures your team is notified before latency degrades user experience.
