# How to Validate Istio Observability Setup for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Monitoring, Prometheus, Kubernetes

Description: How to validate that your Istio observability stack is properly configured for production with metrics, tracing, and logging verification steps.

---

One of the biggest reasons teams adopt Istio is the observability it provides out of the box. Every request flowing through the mesh generates metrics, and you get distributed tracing and access logs without modifying your application code. But "out of the box" does not mean "production ready." There are several things that can go wrong between Istio generating telemetry data and that data showing up in your dashboards.

Here is how to validate that your observability setup is actually working before you need it during an incident.

## Validate Metrics Collection

Istio proxies expose metrics on port 15090 by default. First, confirm that your proxies are actually generating metrics:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15090/stats/prometheus | head -50
```

You should see a wall of Prometheus-format metrics. If this returns nothing, the proxy is not configured to expose metrics.

Now check that Prometheus is actually scraping these metrics. If you are using the Prometheus Operator, verify your PodMonitor or ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: istio-proxy
  namespace: monitoring
spec:
  selector:
    matchExpressions:
      - key: security.istio.io/tlsMode
        operator: Exists
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 15s
```

Verify that Prometheus has targets for Istio:

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Then visit http://localhost:9090/targets and look for istio-related targets
```

## Check Key Istio Metrics

There are a handful of metrics that you absolutely need working for production. Verify each one exists in Prometheus:

```bash
# Request count
curl -s "http://localhost:9090/api/v1/query?query=istio_requests_total" | jq '.data.result | length'

# Request duration
curl -s "http://localhost:9090/api/v1/query?query=istio_request_duration_milliseconds_bucket" | jq '.data.result | length'

# TCP bytes sent/received
curl -s "http://localhost:9090/api/v1/query?query=istio_tcp_sent_bytes_total" | jq '.data.result | length'
```

If any of these return 0 results, your metrics pipeline has a gap. Common causes include:

- Prometheus not scraping the envoy sidecar ports
- Network policies blocking port 15090
- Custom Istio telemetry configuration that filters out default metrics

## Validate Telemetry API Configuration

Istio uses the Telemetry API to control what metrics, traces, and access logs are generated. Check your current configuration:

```bash
kubectl get telemetry -A
```

A production-ready Telemetry resource might look like:

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
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            request_protocol:
              operation: UPSERT
              value: "request.protocol"
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

## Validate Distributed Tracing

Tracing is where most teams run into issues. Istio generates trace spans, but your application code must propagate trace context headers for the traces to connect into a complete picture.

The headers your application needs to forward:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `traceparent`
- `tracestate`

Test that traces are flowing by sending a request and checking your tracing backend:

```bash
kubectl exec deploy/sleep -- curl -s -H "x-request-id: test-trace-123" http://httpbin:8000/get
```

Then search for this trace ID in your tracing backend (Jaeger, Zipkin, etc.).

Check the tracing provider configuration:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A10 "tracing"
```

Verify sampling rate is appropriate. For production, 100% sampling generates too much data. Start with 1%:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 1.0
    extensionProviders:
      - name: zipkin
        zipkin:
          service: zipkin.observability.svc.cluster.local
          port: 9411
```

## Validate Access Logging

Access logs provide request-level detail that metrics and traces might miss. Verify access logging is configured:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep accessLog
```

Check that logs are actually being written:

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=10
```

You should see access log entries for each request. If the logs are empty, access logging might be disabled.

For production, JSON format is recommended because it is easier to parse and index:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

You can also use the Telemetry API for more fine-grained control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This configuration only logs error responses, which significantly reduces log volume while still capturing the information you need for debugging.

## Validate Dashboards

Having metrics is only useful if you can visualize them. If you are using Grafana, import the standard Istio dashboards:

- Istio Mesh Dashboard (ID: 7639)
- Istio Service Dashboard (ID: 7636)
- Istio Workload Dashboard (ID: 7630)
- Istio Control Plane Dashboard (ID: 7645)

Verify each dashboard loads and shows data:

```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

Check for these specific panels:

1. Request rate (requests per second) - should show non-zero values
2. Error rate (percentage of 5xx responses) - should be below your SLO
3. P50/P95/P99 latency - should be within acceptable bounds
4. Control plane push latency - should be below 1 second

## Set Up Alerts

Dashboards are great for investigation, but you need alerts for detection. Create PrometheusRule resources for critical conditions:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio.rules
      rules:
        - alert: IstioHighErrorRate
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (destination_service)
            > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate on {{ $labels.destination_service }}"
        - alert: IstiodDown
          expr: absent(up{job="istiod"} == 1)
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "istiod is down"
```

## Validation Script

Combine all checks into a single validation:

```bash
#!/bin/bash

echo "=== Validating Istio Observability ==="

echo "Checking proxy metrics endpoint..."
kubectl exec deploy/sleep -c istio-proxy -- curl -sf localhost:15090/stats/prometheus > /dev/null && echo "PASS" || echo "FAIL"

echo "Checking Prometheus targets..."
TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq '[.data.activeTargets[] | select(.labels.job | contains("istio"))] | length')
echo "Found $TARGETS Istio targets in Prometheus"

echo "Checking key metrics..."
for metric in istio_requests_total istio_request_duration_milliseconds_bucket; do
  COUNT=$(curl -s "http://localhost:9090/api/v1/query?query=$metric" | jq '.data.result | length')
  echo "$metric: $COUNT time series"
done

echo "=== Validation Complete ==="
```

Observability is the foundation of operating Istio in production. Without proper metrics, traces, and logs, you are flying blind. Take the time to validate every piece of the pipeline before your first production incident forces you to.
