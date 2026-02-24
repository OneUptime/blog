# How to Configure Metric Label Overrides with Telemetry API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Metrics, Prometheus, Cardinality

Description: How to add, remove, and modify metric labels in Istio using the Telemetry API's tagOverrides feature to control cardinality and enrich metrics.

---

Metric labels (also called tags or dimensions) determine how granular your metrics are. Each unique combination of label values creates a separate time series in Prometheus. With Istio's default labels, a mesh of 100 services can easily generate millions of time series. The Telemetry API's `tagOverrides` feature lets you add labels you need, remove ones you don't, and modify existing ones to reduce cardinality.

This post goes deep into label overrides - the mechanics, the CEL expressions you can use, and practical recipes for common scenarios.

## How tagOverrides Work

The `tagOverrides` field in a Telemetry resource lets you modify the label set for specific metrics. Each override specifies:

- The label name
- The operation (`UPSERT` or `REMOVE`)
- For `UPSERT`, a CEL expression that produces the label value

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: label-overrides
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            my_custom_label:
              operation: UPSERT
              value: "request.headers['x-custom'] || 'none'"
            unwanted_label:
              operation: REMOVE
```

## Removing Labels to Reduce Cardinality

The most impactful thing you can do with label overrides is remove labels that create too many time series. Here are the default Istio metric labels and their cardinality impact:

| Label | Typical Cardinality | Usually Needed? |
|-------|-------------------|-----------------|
| `source_workload` | Number of workloads | Yes |
| `destination_service` | Number of services | Yes |
| `response_code` | ~20 unique codes | Often |
| `request_protocol` | 2-3 (HTTP, gRPC, TCP) | Rarely |
| `source_cluster` | Number of clusters | Only in multi-cluster |
| `destination_cluster` | Number of clusters | Only in multi-cluster |
| `connection_security_policy` | 2 (mutual_tls, none) | Rarely |
| `response_flags` | ~15 unique flags | Sometimes |
| `source_principal` | Number of service accounts | Rarely |
| `destination_principal` | Number of service accounts | Rarely |

### Removing Low-Value Labels Mesh-Wide

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
            connection_security_policy:
              operation: REMOVE
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
```

In a mesh with 100 services, removing these four labels can reduce total time series by 30-40%.

### Removing Cluster Labels (Single-Cluster Setup)

If you're running a single cluster, the cluster labels just add cardinality for no value:

```yaml
tagOverrides:
  source_cluster:
    operation: REMOVE
  destination_cluster:
    operation: REMOVE
```

## Adding Custom Labels

Use `UPSERT` to add new labels. The value is a CEL expression that gets evaluated on every request.

### Adding a Response Code Class

Instead of individual response codes (200, 201, 204, 301, 400, 404, 500...), create grouped classes:

```yaml
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

This replaces ~20 unique values with 5 (1xx, 2xx, 3xx, 4xx, 5xx).

### Adding Request Headers as Labels

```yaml
overrides:
  - match:
      metric: REQUEST_COUNT
    tagOverrides:
      api_version:
        operation: UPSERT
        value: "request.headers['x-api-version'] || 'v1'"
      client_type:
        operation: UPSERT
        value: "request.headers['x-client-type'] || 'unknown'"
```

Be very careful here. If the header has unbounded values (like a user ID or session ID), you'll create a cardinality explosion. Only add headers as labels when you know the set of possible values is small and fixed.

### Adding Environment Metadata

```yaml
overrides:
  - match:
      metric: ALL_METRICS
    tagOverrides:
      mesh_id:
        operation: UPSERT
        value: "node.metadata['MESH_ID'] || 'default'"
      cluster_id:
        operation: UPSERT
        value: "node.metadata['CLUSTER_ID'] || 'unknown'"
```

These values come from the proxy's bootstrap metadata and are typically set during installation.

## CEL Expression Reference

The `value` field uses CEL (Common Expression Language). Here are the most useful expressions for metric labels:

### Request Attributes

```yaml
# HTTP method
value: "request.method"

# Request path (careful - high cardinality!)
value: "request.url_path"

# Specific header
value: "request.headers['x-my-header'] || 'default'"

# Host header
value: "request.host"
```

### Response Attributes

```yaml
# Response code as string
value: "string(response.code)"

# Response code class
value: "string(int(response.code / 100)) + 'xx'"

# Specific response header
value: "response.headers['x-custom'] || 'none'"
```

### Connection Attributes

```yaml
# Downstream (client) peer principal
value: "connection.mtls ? connection.requested_server_name : 'plaintext'"
```

### Node Metadata

```yaml
# From proxy metadata
value: "node.metadata['NAMESPACE'] || 'unknown'"
value: "node.metadata['CLUSTER_ID'] || 'unknown'"
value: "node.metadata['MESH_ID'] || 'default'"
```

### Conditional Expressions

```yaml
# Conditional label based on response code
value: "response.code >= 500 ? 'error' : 'success'"

# Map header values to categories
value: "request.headers['x-priority'] == 'high' ? 'high' : 'normal'"
```

## Practical Recipes

### Recipe 1: Cost-Optimized Metrics for Large Meshes

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
        # Remove rarely-used labels from all metrics
        - match:
            metric: ALL_METRICS
          tagOverrides:
            request_protocol:
              operation: REMOVE
            connection_security_policy:
              operation: REMOVE
            source_principal:
              operation: REMOVE
            destination_principal:
              operation: REMOVE
            source_cluster:
              operation: REMOVE
            destination_cluster:
              operation: REMOVE
        # Replace granular response codes with classes
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            response_code:
              operation: REMOVE
            response_code_class:
              operation: UPSERT
              value: "string(int(response.code / 100)) + 'xx'"
        # Disable client-side collection for non-critical metrics
        - match:
            metric: REQUEST_SIZE
            mode: CLIENT
          disabled: true
        - match:
            metric: RESPONSE_SIZE
            mode: CLIENT
          disabled: true
```

### Recipe 2: Multi-Tenant Metrics

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
  namespace: multi-tenant
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            tenant:
              operation: UPSERT
              value: "request.headers['x-tenant-id'] || 'system'"
        - match:
            metric: REQUEST_DURATION
          tagOverrides:
            tenant:
              operation: UPSERT
              value: "request.headers['x-tenant-id'] || 'system'"
```

### Recipe 3: API Version Tracking

```yaml
overrides:
  - match:
      metric: REQUEST_COUNT
    tagOverrides:
      api_version:
        operation: UPSERT
        value: >-
          request.url_path.startsWith('/api/v2') ? 'v2' :
          request.url_path.startsWith('/api/v1') ? 'v1' : 'other'
```

This categorizes requests by API version based on the URL path, with a fixed set of possible values to keep cardinality low.

## Verifying Label Changes

After applying tag overrides, verify the changes in Prometheus:

```bash
kubectl port-forward svc/prometheus 9090:9090 -n istio-system
```

Query a metric and check its labels:

```promql
istio_requests_total{destination_service="reviews.bookinfo.svc.cluster.local"}
```

Verify that removed labels are gone and new labels appear.

You can also check the raw metrics from a specific proxy:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats/prometheus | grep istio_requests_total | head -5
```

## Common Pitfalls

**Adding path-based labels**: `request.url_path` has infinite cardinality. Never add it directly as a label unless you bucket it into categories first.

**Header-based labels with missing headers**: Always provide a default with the `||` operator: `request.headers['x-foo'] || 'default'`. Without a default, the expression might produce unexpected results.

**Forgetting about both modes**: If you modify server-side labels, client-side labels remain unchanged (and vice versa). Be explicit about `mode: CLIENT_AND_SERVER` if you want changes on both sides.

**Override order matters**: Within a single `overrides` list, later entries can reference labels created by earlier entries. But it's cleaner to handle each label independently.

Label overrides are the precision tool for managing metric cardinality in Istio. Invest the time to tune your labels early - it'll save you significant money on metrics storage and make your dashboards faster to query.
