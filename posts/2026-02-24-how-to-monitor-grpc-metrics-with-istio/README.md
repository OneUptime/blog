# How to Monitor gRPC Metrics with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, Monitoring, Prometheus, Kubernetes, Observability

Description: Monitor gRPC services with Istio using built-in Envoy metrics, Prometheus integration, and Grafana dashboards for request rates, latencies, and error tracking.

---

One of the biggest advantages of running gRPC services through Istio is the automatic telemetry you get without instrumenting your application code. Envoy proxies on both sides of every gRPC call collect detailed metrics about request counts, latency distributions, error rates, and more. You just need to know where to look and how to query them.

## Metrics Istio Generates for gRPC

Istio's telemetry system generates standard metrics for all traffic flowing through the mesh. For gRPC services, the most relevant ones are:

- `istio_requests_total` - a counter of all requests, labeled with source, destination, response code, and gRPC status code
- `istio_request_duration_milliseconds` - a histogram of request durations
- `istio_request_bytes` - a histogram of request body sizes
- `istio_response_bytes` - a histogram of response body sizes

These metrics include labels specific to gRPC:
- `grpc_response_status` - the gRPC status code (0 for OK, 14 for UNAVAILABLE, etc.)
- `response_code` - the HTTP status code (200 for most gRPC responses, even errors)
- `request_protocol` - set to "grpc" for gRPC traffic
- `destination_service_name` - the target service
- `source_workload` - the calling workload

## Enabling Metrics Collection

Istio's default installation includes Prometheus integration. Make sure your Istio installation has metrics enabled:

```bash
# Check if Prometheus is scraping Istio metrics
kubectl get servicemonitor -n istio-system

# Verify Envoy is exposing stats
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats/prometheus | head -50
```

If you installed Istio with `istioctl`, the default profile includes Prometheus metrics. You can verify the mesh config:

```bash
kubectl get cm istio -n istio-system -o yaml | grep -A5 "enablePrometheusMerge"
```

The `enablePrometheusMerge` setting (true by default) merges application Prometheus metrics with Envoy metrics on a single scrape endpoint.

## Querying gRPC Metrics with Prometheus

Once metrics are flowing to Prometheus, you can write queries specific to gRPC traffic.

**gRPC request rate by service:**

```promql
sum(rate(istio_requests_total{request_protocol="grpc", destination_service_name="grpc-backend"}[5m])) by (destination_service_name)
```

**gRPC error rate (non-OK status codes):**

```promql
sum(rate(istio_requests_total{request_protocol="grpc", grpc_response_status!="0", destination_service_name="grpc-backend"}[5m]))
/
sum(rate(istio_requests_total{request_protocol="grpc", destination_service_name="grpc-backend"}[5m]))
```

**gRPC request latency (p99):**

```promql
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{request_protocol="grpc", destination_service_name="grpc-backend"}[5m])) by (le))
```

**Requests by gRPC status code:**

```promql
sum(rate(istio_requests_total{request_protocol="grpc", destination_service_name="grpc-backend"}[5m])) by (grpc_response_status)
```

## Setting Up Prometheus

If you do not have Prometheus running yet, you can install it alongside Istio:

```bash
# Using Istio's sample addons
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml

# Verify it is running
kubectl get pods -n istio-system -l app=prometheus
```

For production, you probably want to use the Prometheus Operator or a managed Prometheus service. The key thing is making sure it scrapes the Istio metrics endpoints. Here is a ServiceMonitor for Envoy sidecars:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: envoy-stats
  namespace: istio-system
spec:
  selector:
    matchExpressions:
      - key: istio-prometheus-ignore
        operator: DoesNotExist
  namespaceSelector:
    any: true
  jobLabel: envoy-stats
  endpoints:
    - path: /stats/prometheus
      targetPort: 15090
      interval: 15s
```

## Setting Up Grafana Dashboards

Istio provides pre-built Grafana dashboards. Install Grafana:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Access it:

```bash
kubectl port-forward svc/grafana -n istio-system 3000:3000
```

The built-in dashboards include:
- **Mesh Dashboard** - overview of all services in the mesh
- **Service Dashboard** - detailed view per service
- **Workload Dashboard** - per-workload metrics

These dashboards already handle gRPC traffic. You will see gRPC-specific panels showing success rates based on grpc_response_status rather than HTTP status codes.

## Custom gRPC Dashboard

You can build a custom Grafana dashboard focused on gRPC. Here are useful panels:

**gRPC Success Rate Panel (Gauge):**

```promql
sum(rate(istio_requests_total{request_protocol="grpc", grpc_response_status="0", destination_service_name="grpc-backend"}[5m]))
/
sum(rate(istio_requests_total{request_protocol="grpc", destination_service_name="grpc-backend"}[5m]))
* 100
```

**gRPC Latency Heatmap:**

```promql
sum(rate(istio_request_duration_milliseconds_bucket{request_protocol="grpc", destination_service_name="grpc-backend"}[5m])) by (le)
```

**Top gRPC Errors by Status Code:**

```promql
topk(5, sum(rate(istio_requests_total{request_protocol="grpc", grpc_response_status!="0"}[5m])) by (destination_service_name, grpc_response_status))
```

## Envoy-Level gRPC Stats

Beyond the standard Istio metrics, Envoy exposes detailed gRPC-specific stats. You can access them directly:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep grpc
```

You will see stats like:
- `cluster.outbound|50051||grpc-backend.default.svc.cluster.local.grpc.0` - count of gRPC OK responses
- `cluster.outbound|50051||grpc-backend.default.svc.cluster.local.grpc.14` - count of UNAVAILABLE responses

These stats are per-cluster (per upstream destination) and broken down by gRPC status code number.

## Enabling Additional Metrics

If you want more detailed metrics, you can customize Istio's telemetry. For example, to add request method as a label:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: grpc-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT_AND_SERVER
          tagOverrides:
            grpc_method:
              operation: UPSERT
              value: "request.url_path"
```

This adds a `grpc_method` label to the request count metric so you can see per-method request rates. Be careful with high-cardinality labels though, as they can blow up your Prometheus storage.

## Alerting on gRPC Metrics

Set up Prometheus alerting rules for gRPC services:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: grpc-alerts
  namespace: monitoring
spec:
  groups:
    - name: grpc-service-alerts
      rules:
        - alert: GrpcHighErrorRate
          expr: |
            sum(rate(istio_requests_total{request_protocol="grpc", grpc_response_status!="0", destination_service_name="grpc-backend"}[5m]))
            /
            sum(rate(istio_requests_total{request_protocol="grpc", destination_service_name="grpc-backend"}[5m]))
            > 0.05
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High gRPC error rate on grpc-backend"
            description: "gRPC error rate is above 5% for the last 5 minutes"
        - alert: GrpcHighLatency
          expr: |
            histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{request_protocol="grpc", destination_service_name="grpc-backend"}[5m])) by (le))
            > 1000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High gRPC p99 latency on grpc-backend"
```

Monitoring gRPC through Istio gives you deep visibility without touching application code. The combination of Istio's standard metrics, Prometheus queries, and Grafana dashboards covers most observability needs for gRPC services. Just remember that gRPC error tracking should look at `grpc_response_status` rather than HTTP response codes, since most gRPC responses come back as HTTP 200 regardless of the gRPC status.
