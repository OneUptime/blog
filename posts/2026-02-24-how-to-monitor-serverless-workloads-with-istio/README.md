# How to Monitor Serverless Workloads with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Serverless, Monitoring, Prometheus, Grafana, Observability

Description: A practical guide to monitoring serverless workloads running on Kubernetes with Istio service mesh using Prometheus, Grafana, and Kiali for full observability.

---

Serverless workloads on Kubernetes are great until something goes wrong and you have no idea what happened. The ephemeral nature of serverless makes monitoring tricky. Pods come and go, sometimes lasting only a few seconds, and traditional monitoring approaches that rely on long-lived processes do not work well.

This is where Istio really shines. Because the sidecar proxy intercepts requests while the pod is running, you get consistent telemetry data for mesh traffic without instrumenting every function. For workloads that scale to zero, make sure Prometheus scrapes frequently enough for your traffic pattern, because pull-based scrapes can still miss metrics from pods that start and terminate between scrape intervals.

## What Metrics Istio Collects Automatically

When a request flows through an Istio sidecar, the Envoy proxy emits several standard metrics without you doing anything:

- `istio_requests_total` - Total number of requests, labeled by response code, source, destination
- `istio_request_duration_milliseconds` - Request duration histogram
- `istio_request_bytes` - Request body size
- `istio_response_bytes` - Response body size
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

These metrics follow the RED method (Rate, Errors, Duration) out of the box, which is exactly what you need for serverless monitoring.

## Setting Up Prometheus for Istio Metrics

If you installed Istio with the default profile, Prometheus is not included. You need to install it separately. The easiest way is with the Istio addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/prometheus.yaml
```

Or if you prefer Helm with the kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

When using a separate Prometheus installation, you need to add a scrape config for Istio. With Prometheus Operator, make sure the labels match your Prometheus `podMonitorSelector`, then create a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats-monitor
  namespace: monitoring
  labels:
    monitoring: istio-proxies
spec:
  selector:
    matchExpressions:
      - key: istio-prometheus-ignore
        operator: DoesNotExist
  namespaceSelector:
    any: true
  podMetricsEndpoints:
    - port: http-envoy-prom
      path: /stats/prometheus
      interval: 15s
      relabelings:
        - action: keep
          sourceLabels: [__meta_kubernetes_pod_container_name]
          regex: "istio-proxy"
```

## Key Queries for Serverless Monitoring

Here are the Prometheus queries I find most useful for serverless workloads.

**Request rate per function:**

```promql
sum(rate(istio_requests_total{destination_service_name="my-function"}[5m])) by (destination_service_name)
```

**Error rate (percentage of 5xx responses):**

```promql
sum(rate(istio_requests_total{destination_service_name="my-function", response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{destination_service_name="my-function"}[5m]))
* 100
```

**P99 latency:**

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-function"}[5m])) by (le)
)
```

**Cold start detection** - look for spikes in latency that correlate with new pod creation:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-function"}[1m])) by (le)
)
```

Using a 1-minute window instead of 5 minutes makes cold start spikes more visible in the data.

## Setting Up Grafana Dashboards

Install Grafana if you have not already:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/grafana.yaml
```

Access it:

```bash
istioctl dashboard grafana
```

Istio ships with several built-in dashboards, but for serverless workloads, you will want a custom one. Here is a dashboard JSON snippet for the key panels:

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{destination_service_namespace=\"default\"}[5m])) by (destination_service_name)",
          "legendFormat": "{{destination_service_name}}"
        }
      ]
    },
    {
      "title": "Error Rate %",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{destination_service_namespace=\"default\", response_code=~\"5..\"}[5m])) by (destination_service_name) / sum(rate(istio_requests_total{destination_service_namespace=\"default\"}[5m])) by (destination_service_name) * 100",
          "legendFormat": "{{destination_service_name}}"
        }
      ]
    },
    {
      "title": "P95 Latency",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace=\"default\"}[5m])) by (le, destination_service_name))",
          "legendFormat": "{{destination_service_name}}"
        }
      ]
    }
  ]
}
```

## Using Kiali for Service Graph Visualization

Kiali is probably the most underrated tool in the Istio ecosystem for serverless monitoring. It gives you a live service graph showing how your functions connect to each other and to other services.

Install it:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/kiali.yaml
```

Open the dashboard:

```bash
istioctl dashboard kiali
```

In Kiali, navigate to the Graph view and select your namespace. You will see your serverless functions as nodes in the graph with traffic flowing between them. Kiali color-codes the edges based on error rate, so you can instantly spot which functions are having problems.

For serverless workloads specifically, I recommend setting the graph refresh interval to 15 seconds and using the "Versioned app graph" view. This shows you if traffic is being split between different revisions of your functions.

## Distributed Tracing for Serverless

Metrics tell you what is happening but traces tell you why. Install Jaeger, then configure Istio to send traces to it:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/jaeger.yaml
cat <<EOF > tracing.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing: {}
    extensionProviders:
      - name: jaeger
        opentelemetry:
          port: 4317
          service: jaeger-collector.istio-system.svc.cluster.local
EOF
istioctl install -f tracing.yaml --skip-confirmation
kubectl apply -f - <<EOF
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: jaeger
EOF
```

Istio automatically generates trace spans for sampled requests. However, your functions need to propagate trace headers for the traces to be connected. The headers to propagate are:

- `x-request-id`
- `traceparent`
- `tracestate`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `b3`

In your function code, just copy these headers from the incoming request to any outgoing requests. Here is a Go example:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    headers := []string{
        "x-request-id", "traceparent", "tracestate", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3",
    }

    client := &http.Client{}
    req, err := http.NewRequest("GET", "http://downstream-service", nil)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    for _, h := range headers {
        if v := r.Header.Get(h); v != "" {
            req.Header.Set(h, v)
        }
    }
    resp, err := client.Do(req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
}
```

## Setting Up Alerts

Monitoring without alerting is just watching. Here is a PrometheusRule for common serverless alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: serverless-alerts
  namespace: monitoring
spec:
  groups:
    - name: serverless.rules
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(istio_requests_total{response_code=~"5..", destination_service_namespace="default"}[5m])) by (destination_service_name)
            /
            sum(rate(istio_requests_total{destination_service_namespace="default"}[5m])) by (destination_service_name)
            > 0.05
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "High error rate on {{ $labels.destination_service_name }}"
        - alert: HighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace="default"}[5m])) by (le, destination_service_name)
            ) > 5000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High p99 latency on {{ $labels.destination_service_name }}"
```

## Summary

Monitoring serverless workloads with Istio covers the gaps that traditional monitoring misses. You get automatic metrics collection through the sidecar proxy, which means even the shortest-lived functions produce useful telemetry. Combined with Prometheus for storage, Grafana for visualization, Kiali for service graphs, and Jaeger for traces, you have complete visibility into your serverless platform. The most important thing is to set up alerts early so you find out about problems before your users do.
