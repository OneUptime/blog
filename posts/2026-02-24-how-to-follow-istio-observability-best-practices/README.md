# How to Follow Istio Observability Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Monitoring, Best Practices, Prometheus

Description: Best practices for setting up observability in Istio, including metrics, tracing, logging, and dashboard strategies for production.

---

Istio gives you observability for free. Every request that flows through the mesh generates metrics, and you can add tracing and access logging on top. But "free" does not mean "good by default." Without tuning, you end up with too many metrics you do not need, not enough traces of the requests that matter, and access logs that fill up your storage without providing insight.

Here is how to set up observability in Istio so it actually helps you when things go wrong.

## Start with the Right Metrics

Istio's default metrics cover the basics well. Focus on these four for your initial dashboards:

- **istio_requests_total** - Request volume by service, response code, and other dimensions
- **istio_request_duration_milliseconds** - Latency distribution
- **istio_tcp_sent_bytes_total** - TCP traffic volume
- **istio_tcp_connections_opened_total** - Connection count

Build your SLI/SLO dashboards around request rate, error rate, and latency (the RED method):

```
# Error rate
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service)
/
sum(rate(istio_requests_total[5m])) by (destination_service)

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (destination_service, le))

# Request rate
sum(rate(istio_requests_total[5m])) by (destination_service)
```

## Trim Metric Cardinality

High cardinality is the number one operational issue with Istio metrics. Each unique label combination creates a time series. With the default labels, cardinality grows as:

```
sources x destinations x response_codes x methods x protocols x ...
```

In a mesh with 100 services, this can easily produce millions of time series.

Reduce it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: optimize-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        # Remove labels that don't add value
        - match:
            metric: ALL_METRICS
          tagOverrides:
            connection_security_policy:
              operation: REMOVE
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
        # Disable client-side metrics (server-side is usually enough)
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
```

Disabling client-side metrics alone cuts your metric volume in half. In most cases, server-side metrics are more accurate for latency measurements anyway.

## Configure Tracing Properly

Tracing gives you the ability to follow a single request through the entire mesh. But 100% tracing in production is expensive and unnecessary.

Set a reasonable sampling rate:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 1.0
      customTags:
        environment:
          literal:
            value: "production"
        cluster:
          literal:
            value: "us-east-1"
```

One percent sampling is a good starting point. Adjust based on your traffic volume and trace storage budget.

For critical namespaces, increase the rate:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: checkout-tracing
  namespace: checkout
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10.0
```

## Propagate Trace Headers in Your Applications

This is the most common source of broken distributed traces. Istio proxies generate trace spans, but your application code must forward trace headers to downstream services. If your app makes an outbound HTTP call without forwarding the headers, the trace breaks.

The headers to propagate:

```
x-request-id
x-b3-traceid
x-b3-spanid
x-b3-parentspanid
x-b3-sampled
x-b3-flags
traceparent
tracestate
```

Every HTTP client in your application code needs to copy these headers from the incoming request to outgoing requests. Most web frameworks have middleware that handles this automatically.

## Use Access Logs Strategically

Access logs for every request are too expensive in production. Filter them:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || response.duration > 5000"
```

This logs only errors and slow requests. When you need full access logs for debugging, enable them temporarily on a specific workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-logging
  namespace: production
spec:
  selector:
    matchLabels:
      app: problematic-service
  accessLogging:
    - providers:
        - name: envoy
```

## Monitor the Control Plane

Do not just monitor your application traffic. Monitor Istio itself:

```yaml
# Key istiod metrics to dashboard and alert on

# Config push latency - if this is high, config changes are slow
# pilot_proxy_convergence_time

# Push errors - proxies rejecting config
# pilot_total_xds_rejects

# Connected proxies - should match your expected pod count
# pilot_xds_pushes

# Conflict detection
# pilot_conflict_inbound_listener
# pilot_conflict_outbound_listener_tcp_over_current_tcp
```

Set up alerts:

```yaml
# Alert if config push errors spike
- alert: IstioConfigPushErrors
  expr: rate(pilot_total_xds_rejects[5m]) > 0
  for: 5m
  labels:
    severity: warning

# Alert if convergence time is high
- alert: IstioConvergenceSlow
  expr: histogram_quantile(0.99, rate(pilot_proxy_convergence_time_bucket[5m])) > 10
  for: 10m
  labels:
    severity: warning
```

## Set Up Grafana Dashboards

Use the official Istio Grafana dashboards as a starting point:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
```

The key dashboards:

- **Mesh Dashboard** - High-level mesh health
- **Service Dashboard** - Per-service metrics
- **Workload Dashboard** - Per-workload metrics
- **Control Plane Dashboard** - istiod health

Customize them to match your team's needs. Add panels for your SLOs and remove panels you never look at.

## Use Kiali for Service Mesh Visualization

Kiali provides a topology graph of your mesh that is incredibly useful for understanding traffic flow:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml
```

Kiali shows you:

- Which services are communicating
- Traffic volume between services
- Error rates on each connection
- Configuration validation

It is the best tool for getting a quick visual understanding of your mesh health.

## Correlate Metrics, Traces, and Logs

The real power of observability comes from correlating signals. When you see an error rate spike in metrics, you want to jump to the traces that show the failing requests, and then to the logs that show the error details.

Set up exemplars in Prometheus to link metrics to traces:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
```

In Grafana, configure the Prometheus data source to use exemplars and link to your trace backend (Tempo, Jaeger, etc.).

## Regular Observability Hygiene

1. **Review and prune unused dashboards quarterly** - Stale dashboards create noise
2. **Check metric cardinality monthly** - It tends to grow over time as new services are added
3. **Validate trace sampling monthly** - Make sure you are still getting enough traces for debugging
4. **Test your alerts** - Run fault injection periodically and verify that alerts fire
5. **Keep Istio addons updated** - Prometheus, Grafana, and Kiali should be on recent versions

Good observability is not about collecting everything. It is about collecting the right things and making them easy to use when you need them. Start lean, add more when you have a specific question you cannot answer, and regularly clean up what you no longer need.
