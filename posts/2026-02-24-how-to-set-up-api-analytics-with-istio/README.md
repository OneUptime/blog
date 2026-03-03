# How to Set Up API Analytics with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Analytics, Prometheus, Grafana, Observability

Description: How to collect, visualize, and analyze API usage metrics using Istio's built-in telemetry with Prometheus, Grafana, and custom dashboards.

---

One of the biggest advantages of running a service mesh is the observability you get for free. Every request flowing through Istio's Envoy proxies generates metrics about latency, error rates, request volume, and more. With the right setup, you can turn these raw metrics into meaningful API analytics without adding any instrumentation to your application code.

## What Istio Collects Automatically

Every Envoy sidecar and the ingress gateway emit standard metrics. The most useful ones for API analytics are:

- `istio_requests_total` - total request count by response code, source, destination
- `istio_request_duration_milliseconds` - request latency histogram
- `istio_request_bytes` - request body size
- `istio_response_bytes` - response body size
- `istio_tcp_connections_opened_total` - TCP connection count
- `istio_tcp_connections_closed_total` - TCP disconnection count

These metrics are labeled with source and destination service names, namespaces, response codes, and more.

## Setting Up Prometheus

Istio works with Prometheus out of the box. Install the Istio Prometheus add-on:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

Verify Prometheus is scraping Istio metrics:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

Open `http://localhost:9090` and query:

```text
istio_requests_total
```

You should see metrics flowing in from all your services.

## Setting Up Grafana

Install Grafana with Istio's pre-built dashboards:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Access it:

```bash
istioctl dashboard grafana
```

Istio ships with several dashboards:

- **Mesh Dashboard** - overall mesh health
- **Service Dashboard** - per-service metrics
- **Workload Dashboard** - per-workload details
- **Performance Dashboard** - control plane performance

## Building API-Specific Dashboards

The default Istio dashboards are great for operations, but for API analytics you want to focus on different things. Create a custom Grafana dashboard with these panels:

### Total API Requests per Endpoint

```text
sum(rate(istio_requests_total{reporter="source", destination_service=~".*", request_host="api.example.com"}[5m])) by (destination_service, request_url_path)
```

### Error Rate by Endpoint

```text
sum(rate(istio_requests_total{reporter="source", response_code=~"5.*", request_host="api.example.com"}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{reporter="source", request_host="api.example.com"}[5m])) by (destination_service)
```

### P95 Latency

```text
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", request_host="api.example.com"}[5m])) by (le, destination_service))
```

### Request Volume Over Time

```text
sum(increase(istio_requests_total{reporter="source", request_host="api.example.com"}[1h])) by (destination_service)
```

## Custom Metrics with Telemetry API

Istio's Telemetry API lets you customize what metrics are collected. Add custom dimensions based on request attributes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-analytics
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
            request_url_path:
              operation: UPSERT
              value: request.url_path
            request_method:
              operation: UPSERT
              value: request.method
            api_version:
              operation: UPSERT
              value: request.headers["x-api-version"]
            client_id:
              operation: UPSERT
              value: request.headers["x-client-id"]
```

This adds `request_url_path`, `request_method`, `api_version`, and `client_id` as metric labels. Now you can query per-client and per-API-version analytics.

## Per-Client Analytics

With the custom `client_id` dimension, track usage per client:

```text
sum(increase(istio_requests_total{client_id!=""}[24h])) by (client_id)
```

Top clients by request volume:

```text
topk(10, sum(increase(istio_requests_total{client_id!=""}[24h])) by (client_id))
```

Client error rates:

```text
sum(rate(istio_requests_total{client_id!="", response_code=~"5.*"}[1h])) by (client_id)
```

## Access Logging for Detailed Analytics

For detailed analytics beyond what metrics provide, enable access logging:

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
        expression: response.code >= 400
```

For comprehensive logging, remove the filter. Forward logs to an ELK stack or similar for analysis:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: full-access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Customize the access log format to include API analytics fields:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      {"timestamp":"%START_TIME%","method":"%REQ(:METHOD)%","path":"%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%","protocol":"%PROTOCOL%","status":"%RESPONSE_CODE%","duration":"%DURATION%","bytes_received":"%BYTES_RECEIVED%","bytes_sent":"%BYTES_SENT%","upstream_service":"%UPSTREAM_CLUSTER%","client_id":"%REQ(X-CLIENT-ID)%","api_version":"%REQ(X-API-VERSION)%","request_id":"%REQ(X-REQUEST-ID)%","user_agent":"%REQ(USER-AGENT)%"}
```

## Kiali for Service Graph Analytics

Kiali provides visual analytics about how services communicate:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
istioctl dashboard kiali
```

Kiali shows:

- Service topology graph
- Traffic flow between services
- Error rates on each edge
- Request volume visualization
- Response time distribution

## Building a Custom Analytics Pipeline

For production API analytics, pipe Istio metrics into a proper analytics system:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-remote-write
  namespace: istio-system
data:
  prometheus.yml: |
    remote_write:
      - url: "https://analytics.example.com/api/v1/write"
        basic_auth:
          username: "prometheus"
          password: "secret"
        write_relabel_configs:
          - source_labels: [__name__]
            regex: "istio_.*"
            action: keep
```

This forwards all Istio metrics to an external analytics platform while filtering out non-Istio metrics.

## Alerting on API Metrics

Set up alerts for API health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: api-alerts
  namespace: istio-system
spec:
  groups:
    - name: api-health
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(istio_requests_total{response_code=~"5.*", request_host="api.example.com"}[5m]))
            / sum(rate(istio_requests_total{request_host="api.example.com"}[5m])) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "API error rate exceeds 5%"
        - alert: HighLatency
          expr: |
            histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{request_host="api.example.com"}[5m])) by (le)) > 5000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "API P99 latency exceeds 5 seconds"
        - alert: TrafficDrop
          expr: |
            sum(rate(istio_requests_total{request_host="api.example.com"}[5m]))
            < sum(rate(istio_requests_total{request_host="api.example.com"}[5m] offset 1h)) * 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "API traffic dropped by more than 50% compared to 1 hour ago"
```

## Useful Queries for API Analytics

Here are some Prometheus queries you will use regularly:

**Requests per second by service:**
```text
sum(rate(istio_requests_total{reporter="source"}[5m])) by (destination_service_name)
```

**Success rate:**
```text
sum(rate(istio_requests_total{reporter="source", response_code!~"5.*"}[5m])) / sum(rate(istio_requests_total{reporter="source"}[5m]))
```

**Average response size:**
```text
sum(rate(istio_response_bytes_sum[5m])) / sum(rate(istio_response_bytes_count[5m]))
```

**Busiest hours:**
```text
sum(increase(istio_requests_total{request_host="api.example.com"}[1h])) by (hour)
```

Istio gives you API analytics capability that would otherwise require a dedicated analytics service. The combination of automatic metric collection, Prometheus, and Grafana covers most analytics needs without any application changes.
