# How to Configure Custom Metric Dimensions in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Custom Dimensions, Telemetry API, Prometheus

Description: How to add custom dimensions and labels to Istio metrics using the Telemetry API and EnvoyFilter, enabling richer metric breakdowns by request headers, paths, and custom attributes.

---

Istio's default metrics come with a standard set of labels like `source_workload`, `destination_service_name`, and `response_code`. But sometimes you need to break down metrics by custom attributes, like API version, customer tier, or specific request headers. Istio lets you add custom dimensions to its metrics without modifying your application code.

## Default Metric Labels

Out of the box, Istio metrics include these labels:

- `reporter` - "source" or "destination"
- `source_workload` - Name of the source workload
- `source_workload_namespace` - Namespace of the source
- `source_principal` - SPIFFE identity of the source
- `destination_workload` - Name of the destination workload
- `destination_service_name` - Destination service name
- `destination_service_namespace` - Destination namespace
- `request_protocol` - HTTP or gRPC
- `response_code` - HTTP response code
- `connection_security_policy` - mTLS or none

## Adding Custom Dimensions with the Telemetry API

The Telemetry API is the recommended way to customize metrics in Istio. Here is how to add a custom dimension based on a request header:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
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
        api_version:
          operation: UPSERT
          value: "request.headers['x-api-version'] | 'unknown'"
        customer_tier:
          operation: UPSERT
          value: "request.headers['x-customer-tier'] | 'standard'"
```

This adds two new labels to the `istio_requests_total` metric:
- `api_version` - Extracted from the `x-api-version` request header, defaults to "unknown"
- `customer_tier` - Extracted from the `x-customer-tier` header, defaults to "standard"

The values use Istio's attribute expression syntax, where `|` is the default operator.

## Custom Dimensions on Specific Metrics

You can target different metrics independently:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        api_version:
          operation: UPSERT
          value: "request.headers['x-api-version'] | 'unknown'"
    - match:
        metric: REQUEST_DURATION
      tagOverrides:
        api_version:
          operation: UPSERT
          value: "request.headers['x-api-version'] | 'unknown'"
        request_size_category:
          operation: UPSERT
          value: "request.size <= 1024 ? 'small' : request.size <= 10240 ? 'medium' : 'large'"
    - match:
        metric: REQUEST_SIZE
      tagOverrides:
        content_type:
          operation: UPSERT
          value: "request.headers['content-type'] | 'unknown'"
```

The `request_size_category` dimension categorizes requests by size, which is useful for understanding if large requests are causing latency issues.

## Removing Default Labels

Some default labels create unnecessary cardinality. You can remove them:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-cardinality
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        source_principal:
          operation: REMOVE
        destination_principal:
          operation: REMOVE
        request_protocol:
          operation: REMOVE
```

Removing high-cardinality labels like `source_principal` can significantly reduce your Prometheus storage requirements.

## Path-Based Dimensions

Adding the full request path as a metric label is dangerous because it creates unbounded cardinality (each unique URL becomes a label value). Instead, use path templates:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: path-dimensions
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        api_endpoint:
          operation: UPSERT
          value: |
            request.url_path.startsWith('/api/v1/users') ? '/api/v1/users' :
            request.url_path.startsWith('/api/v1/orders') ? '/api/v1/orders' :
            request.url_path.startsWith('/api/v2/') ? '/api/v2/*' :
            'other'
```

This maps specific path prefixes to fixed label values, keeping cardinality bounded.

## Using EnvoyFilter for Advanced Dimensions

For more complex dimension extraction, you can use EnvoyFilter to modify the stats configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-stats-tags
  namespace: istio-system
spec:
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: ANY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: istio.stats
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/stats.PluginConfig
          value:
            metrics:
            - name: requests_total
              dimensions:
                api_version: "request.headers['x-api-version'] | 'unknown'"
              tags_to_remove:
              - request_protocol
```

## Custom Metrics from Response Headers

You can also extract dimensions from response headers:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: response-header-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        cache_status:
          operation: UPSERT
          value: "response.headers['x-cache-status'] | 'miss'"
        backend_version:
          operation: UPSERT
          value: "response.headers['x-backend-version'] | 'unknown'"
```

This lets you track cache hit rates and backend version distribution in your metrics.

## Querying Custom Dimensions

Once your custom dimensions are in place, use them in PromQL:

```promql
# Request rate by API version
sum(rate(istio_requests_total{destination_service_name="my-api"}[5m])) by (api_version)

# Error rate by customer tier
sum(rate(istio_requests_total{destination_service_name="my-api", response_code=~"5.."}[5m])) by (customer_tier)
/
sum(rate(istio_requests_total{destination_service_name="my-api"}[5m])) by (customer_tier)

# Latency by API endpoint
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-api"}[5m]))
  by (api_endpoint, le)
)

# Cache hit rate
sum(rate(istio_requests_total{destination_service_name="my-api", cache_status="hit"}[5m]))
/
sum(rate(istio_requests_total{destination_service_name="my-api"}[5m]))
```

## Testing Custom Dimensions

Verify your custom dimensions are working:

```bash
# Send a request with custom headers
kubectl exec <test-pod> -- curl -H "x-api-version: v2" -H "x-customer-tier: premium" \
  http://my-api:8080/api/v1/users

# Check the metrics endpoint on the sidecar
kubectl exec <my-api-pod> -c istio-proxy -- \
  curl -s localhost:15020/stats/prometheus | grep istio_requests_total
```

Look for your custom labels in the output.

## Cardinality Best Practices

Every custom dimension multiplies the number of time series. If you have 10 services, 5 response codes, and add a custom dimension with 3 possible values, your time series count goes from 50 to 150. With high-cardinality dimensions, this can explode quickly.

Rules of thumb:
- Keep each dimension to under 20 distinct values
- Never use unbounded values (like user IDs or request IDs) as dimensions
- Use categories instead of raw values (e.g., "small/medium/large" instead of exact byte counts)
- Monitor your Prometheus time series count after adding new dimensions
- Remove dimensions you do not actively use

Custom metric dimensions turn Istio's generic metrics into rich, business-relevant metrics. The key is being thoughtful about what dimensions you add and keeping cardinality under control.
