# How to Customize Metrics Collection with Telemetry API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Metrics, Prometheus, Observability

Description: Learn how to use the Istio Telemetry API to customize metric collection, add custom labels, remove high-cardinality tags, and control what gets sent to Prometheus.

---

Istio generates a solid set of default metrics out of the box, but the defaults aren't always what you need. Maybe you're paying too much for Prometheus storage because of high-cardinality labels. Maybe you need a custom dimension on your metrics that Istio doesn't include by default. Or maybe you want to disable metrics you never look at.

The Telemetry API gives you fine-grained control over all of this. You can add labels, remove labels, rename labels, and enable or disable individual metrics - all without touching EnvoyFilters or restarting Istio.

## Default Istio Metrics

Before customizing, it helps to know what Istio collects by default. The standard metrics are:

| Metric | Type | Description |
|--------|------|-------------|
| `istio_requests_total` | Counter | Total request count |
| `istio_request_duration_milliseconds` | Histogram | Request latency |
| `istio_request_bytes` | Histogram | Request body size |
| `istio_response_bytes` | Histogram | Response body size |
| `istio_tcp_sent_bytes_total` | Counter | TCP bytes sent |
| `istio_tcp_received_bytes_total` | Counter | TCP bytes received |
| `istio_tcp_connections_opened_total` | Counter | TCP connections opened |
| `istio_tcp_connections_closed_total` | Counter | TCP connections closed |

Each metric includes labels like `source_workload`, `destination_service`, `response_code`, `request_protocol`, and more. These labels are useful but can create high cardinality when you have many services.

## Removing High-Cardinality Labels

The most common customization is removing labels that create too many time series. For example, `response_code` creates separate series for every HTTP status code (200, 201, 204, 301, 400, 404, 500, 502, 503...).

To remove a label from all metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_protocol:
              operation: REMOVE
            destination_cluster:
              operation: REMOVE
```

This removes `request_protocol` and `destination_cluster` from all metrics, reducing cardinality significantly in multi-cluster setups.

To remove a label from a specific metric only:

```yaml
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_DURATION
          tagOverrides:
            response_code:
              operation: REMOVE
```

## Adding Custom Labels

You can add custom labels based on request attributes, response attributes, or environment variables. This is done using the `UPSERT` operation with a CEL expression.

### Adding a Response Code Class Label

Instead of the full response code (200, 201, 404, 500...), you might want a grouped version (2xx, 4xx, 5xx):

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
          tagOverrides:
            response_code:
              operation: REMOVE
            response_code_class:
              operation: UPSERT
              value: "string(int(response.code / 100)) + 'xx'"
```

This replaces the granular `response_code` label with a `response_code_class` label that groups responses into 2xx, 3xx, 4xx, and 5xx.

### Adding a Custom Header as a Label

If you want to track metrics by a custom header (like a tenant ID or feature flag):

```yaml
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            tenant_id:
              operation: UPSERT
              value: "request.headers['x-tenant-id'] || 'unknown'"
```

Be careful with this - if the header has many unique values, it will create high cardinality. Only do this for headers with a bounded set of values.

### Adding Environment-Based Labels

Add labels based on environment variables in the proxy container:

```yaml
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            cluster_name:
              operation: UPSERT
              value: "node.metadata['CLUSTER_ID'] || 'unknown'"
```

## Disabling Unused Metrics

If you never look at request/response size histograms, disable them to save resources:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_SIZE
          disabled: true
        - match:
            metric: RESPONSE_SIZE
          disabled: true
```

You can also disable metrics on just the client or server side:

```yaml
overrides:
  - match:
      metric: REQUEST_DURATION
      mode: CLIENT
    disabled: true
```

This collects request duration only on the server side, which is sufficient for most monitoring use cases and cuts the time series in half.

## Controlling Client vs Server Metrics

Every metric is collected twice by default: once on the client (outbound) side and once on the server (inbound) side. Client-side metrics have labels prefixed with `source_` for the local workload and `destination_` for the remote service. Server-side metrics flip this.

Having both gives you redundancy and different perspectives, but it doubles your metric volume. In many cases, server-side metrics alone are sufficient:

```yaml
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT
          disabled: true
```

This cuts your Istio metric volume roughly in half.

## Practical Example: Optimized Production Metrics

Here's a Telemetry configuration optimized for a production environment with 100+ services:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        # Disable request/response size metrics
        - match:
            metric: REQUEST_SIZE
          disabled: true
        - match:
            metric: RESPONSE_SIZE
          disabled: true
        # Disable client-side metrics for TCP
        - match:
            metric: TCP_SENT_BYTES
            mode: CLIENT
          disabled: true
        - match:
            metric: TCP_RECEIVED_BYTES
            mode: CLIENT
          disabled: true
        # Remove high-cardinality labels from all metrics
        - match:
            metric: ALL_METRICS
          tagOverrides:
            destination_cluster:
              operation: REMOVE
            source_cluster:
              operation: REMOVE
        # Add response code class to request count
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            response_code_class:
              operation: UPSERT
              value: "string(int(response.code / 100)) + 'xx'"
```

## Verifying Metric Customizations

After applying your Telemetry configuration, verify the changes:

### Check Prometheus Directly

```bash
kubectl port-forward svc/prometheus 9090:9090 -n istio-system
```

Open Prometheus and run a query. Check that removed labels are gone:

```promql
istio_requests_total
```

Look at the label set. If you removed `request_protocol`, it shouldn't appear.

### Check Envoy Stats

You can also check what metrics Envoy is generating on a specific pod:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- pilot-agent request GET stats/prometheus | head -50
```

### Check the Telemetry Resource

```bash
kubectl get telemetry -A -o yaml
```

Make sure there are no status errors on the resource.

## Common Mistakes

**Adding labels with unbounded cardinality**: A label based on user ID or request path will explode your metric storage. Only add labels with a small, known set of values.

**Removing essential labels**: If you remove `destination_service` from `istio_requests_total`, Kiali's graph will break because it depends on that label for building the topology.

**Forgetting about both client and server**: If you customize server-side metrics, remember that client-side metrics still have the old labels unless you customize those too (or disable them).

**Not waiting for rollout**: Telemetry changes are picked up by the Envoy proxy, but it can take a minute or two for the xDS push to reach all sidecars. Don't panic if changes aren't immediate.

The Telemetry API makes metric customization straightforward and predictable. Take the time to trim unnecessary metrics and labels, because in a large mesh the storage and query performance savings are substantial.
