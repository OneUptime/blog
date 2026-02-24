# How to Configure Custom Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Custom Metrics, Telemetry, Envoy, Prometheus

Description: Create custom metrics in Istio using the Telemetry API and EnvoyFilter to track business-specific measurements beyond the standard Istio metrics.

---

Istio's default metrics cover the basics well - request counts, latency, and sizes. But every team has metrics that are specific to their business. Maybe you need to track requests by API version, count requests per customer tenant, or measure latency by payment type. Custom metrics let you extract these dimensions from your traffic without changing application code.

## Two Approaches to Custom Metrics

There are two ways to create custom metrics in Istio:

1. **Telemetry API** - add custom labels (tags) to existing metrics. This is the simpler and recommended approach for most cases.
2. **EnvoyFilter with Wasm or Lua** - create entirely new metrics with custom names and types. More powerful but more complex.

Most teams should start with the Telemetry API since it handles the majority of use cases.

## Adding Custom Labels with the Telemetry API

The Telemetry API lets you add new labels to Istio's standard metrics. The label values are extracted from request or response attributes at runtime.

### Labeling by API Version Header

If your clients send an API version header, you can track metrics per version:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-version-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            api_version:
              operation: UPSERT
              value: "request.headers['x-api-version']"
```

Now `istio_requests_total` includes an `api_version` label. Query it like:

```promql
sum(rate(istio_requests_total{
  destination_workload="my-api",
  api_version="v2"
}[5m]))
```

### Labeling by URL Path Segment

Track metrics by specific path components:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: path-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            request_path:
              operation: UPSERT
              value: "request.url_path"
```

Be careful with this one - if your API has parameterized paths like `/users/12345`, each unique path creates a new time series. This can explode cardinality quickly. Only use it if your paths have a bounded set of values.

### Multi-Tenant Metrics

For SaaS applications, tracking metrics per tenant is valuable:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tenant-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            tenant_id:
              operation: UPSERT
              value: "request.headers['x-tenant-id']"
        - match:
            metric: REQUEST_DURATION
            mode: SERVER
          tagOverrides:
            tenant_id:
              operation: UPSERT
              value: "request.headers['x-tenant-id']"
```

Now you can track error rates and latency per tenant:

```promql
# Error rate by tenant
sum(rate(istio_requests_total{
  response_code=~"5..",
  destination_workload="order-service"
}[5m])) by (tenant_id)
/
sum(rate(istio_requests_total{
  destination_workload="order-service"
}[5m])) by (tenant_id)
```

### Response-Based Labels

Labels can also come from response attributes:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: response-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            cache_status:
              operation: UPSERT
              value: "response.headers['x-cache-status']"
```

This tracks cache hit/miss rates at the mesh level. Your application sets the `x-cache-status` header, and Istio extracts it into a metric label.

## Creating New Metrics with EnvoyFilter

When you need entirely new metrics (not just labels on existing ones), use an EnvoyFilter with the stats filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-metrics
  namespace: istio-system
spec:
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: istio.stats
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/stats.PluginConfig
            value:
              definitions:
                - name: my_custom_request_count
                  type: COUNTER
                  value: "1"
                - name: my_custom_request_size
                  type: HISTOGRAM
                  value: "request.size"
```

This creates two new metrics: a counter that increments on every request and a histogram of request sizes. These show up as `istio_my_custom_request_count` and `istio_my_custom_request_size` in Prometheus.

## Custom Metrics with Attribute Conditions

You can make custom metrics conditional - only counting when certain conditions are met:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-metrics
  namespace: production
spec:
  workloadSelector:
    labels:
      app: payment-service
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: istio.stats
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/stats.PluginConfig
            value:
              definitions:
                - name: payment_success_total
                  type: COUNTER
                  value: "response.code == 200 ? 1 : 0"
                - name: payment_failure_total
                  type: COUNTER
                  value: "response.code >= 400 ? 1 : 0"
```

## Using Wasm for Advanced Custom Metrics

For the most flexibility, you can write a Wasm plugin that generates custom metrics. Here's a basic example structure using the proxy-wasm SDK:

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-metrics-plugin
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://my-registry/custom-metrics-wasm:v1
  phase: STATS
  pluginConfig:
    metrics:
      - name: business_transactions_total
        labels:
          - transaction_type
          - customer_tier
```

The Wasm binary would inspect request/response headers and increment custom counters. This is more work to build but gives you complete control over what gets measured.

## Practical Examples

### Track Slow Requests

Add a label that flags requests above a latency threshold:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: slow-request-tracking
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            request_method:
              operation: UPSERT
              value: "request.method"
```

Then combine with the duration histogram to find slow endpoints:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_workload="api-service",
    request_method="POST"
  }[5m])) by (le)
)
```

### Track Authenticated vs Unauthenticated Traffic

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: auth-metrics
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            has_auth:
              operation: UPSERT
              value: "request.headers['authorization'] != '' ? 'true' : 'false'"
```

## Verifying Custom Metrics

After deploying custom metric configurations, check that they appear:

```bash
# Generate some traffic
kubectl exec deploy/sleep -- curl -s http://my-service:8080/api/test \
  -H "x-api-version: v2" -H "x-tenant-id: acme"

# Check the metrics
kubectl exec <my-service-pod> -c istio-proxy -- \
  curl -s localhost:15020/stats/prometheus | grep -E "(api_version|tenant_id)"
```

You should see the new labels on the Istio metrics.

## Cardinality Warning

Every custom label multiplies the number of time series. Before adding a label, estimate the cardinality:

- A label with 3 possible values triples the time series for that metric
- A label with 100 possible values (like `tenant_id`) creates 100x more series

Always think about the cardinality impact before deploying custom labels to production. Start with one metric (usually `REQUEST_COUNT`) and expand to others only if needed.

Custom metrics bridge the gap between infrastructure monitoring and business monitoring. Istio's Telemetry API makes it straightforward to add the dimensions that matter to your specific use case, all without changing a line of application code.
