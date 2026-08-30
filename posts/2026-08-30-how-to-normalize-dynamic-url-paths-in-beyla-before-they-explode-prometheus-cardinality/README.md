# How to Normalize Beyla URL Paths to Control Prometheus Cardinality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Prometheus, Cardinality, HTTP, Observability

Description: Map dynamic request paths to stable HTTP routes in Grafana Beyla with explicit patterns, heuristic fallback, and per-segment cardinality control.

---

A metric label such as `http_route="/users/7f9c..."` creates a new Prometheus series for every user, order, or document. Multiplying those values by status code, method, service, namespace, and replica can exhaust a metrics budget quickly.

Beyla observes the concrete URL path at the protocol boundary, while OpenTelemetry expects a low-cardinality `http.route`. The `routes` decorator turns concrete paths into stable route templates before metrics and traces leave Beyla.

## Define known routes explicitly

Explicit patterns are deterministic from the first request:

```yaml
routes:
  patterns:
    - /users/{user_id}
    - /users/{user_id}/orders/{order_id}
    - /documents/:document_id
    - /assets/*
  unmatched: low-cardinality
  max_path_segment_cardinality: 20
```

Both `{name}` and `:name` identify a variable segment. The wildcard `*` matches a prefix, so `/assets/*` intentionally groups every nested asset path. Requests to `/users/123` and `/users/456` now share `http.route=/users/{user_id}`.

Use explicit patterns for high-volume public APIs and SLO routes. They preserve useful operation names without relying on heuristic detection or waiting for low-cardinality mode to observe enough unique children.

## Choose the unmatched policy carefully

Current Beyla supports four useful unmatched behaviors:

- `heuristic` replaces segments that look numeric, random, or non-word-like. It requires little configuration, but human-looking identifiers can remain unique.
- `low-cardinality` starts with heuristics and collapses a path segment after its number of unique children exceeds `max_path_segment_cardinality`. It is the current Beyla default.
- `wildcard` assigns a generic `/**` route. Cardinality is minimal but route-level diagnosis is lost.
- `unset` leaves `http.route` absent for unmatched paths.

Avoid `unmatched: path` in a Prometheus pipeline unless every path is already bounded. It copies the concrete URL path into `http.route`, which is precisely the cardinality problem the decorator is meant to prevent.

Low-cardinality mode keeps its per-service route database in memory. It resets when Beyla restarts, and requests observed before a segment crosses the threshold can retain their original path. That makes it a fallback, not a replacement for explicit patterns on known endpoints.

## Tune routes per service

Different applications can have different path structures. Add service-specific incoming and outgoing rules inside a discovery entry:

```yaml
discovery:
  instrument:
    - k8s_deployment_name: "checkout"
      routes:
        incoming:
          - /api/carts/{cart_id}
          - /api/orders/{order_id}
        outgoing:
          - /inventory/items/{sku}

    - k8s_deployment_name: "frontend"

routes:
  patterns:
    - /health
  unmatched: low-cardinality
  max_path_segment_cardinality: 20
```

Per-service patterns append to the global patterns. Separating incoming from outgoing routes is useful when a backend exposes a small API but calls a third party with unbounded paths. A deliberate outgoing `/*` can collapse all unmatched client paths for that service when destination-level route detail has no operational value.

## Do not turn sensitive data into labels

Route normalization protects cardinality, but it is also a data-minimization control. Account IDs, emails, tokens, and search values do not belong in metric labels. Keep query strings out of route patterns and avoid an attribute selection that adds raw `url.path` to every metric.

Review `attributes.select` if paths still appear after route configuration:

```yaml
attributes:
  select:
    http_*:
      exclude:
        - url.path
        - url_path
```

Beyla accepts OpenTelemetry and Prometheus naming forms in attribute selection. Excluding the raw path ensures a normalized `http.route` is not undermined by a second high-cardinality label.

## Measure before and after

In a Prometheus-compatible backend, count unique route label values by service using the metric names your Beyla version exports. For example:

```promql
count by (service_name) (
  count by (service_name, http_route) (
    http_server_request_duration_seconds_count
  )
)
```

Also inspect the highest-volume routes:

```promql
topk(20,
  sum by (service_name, http_route) (
    rate(http_server_request_duration_seconds_count[5m])
  )
)
```

Metric and attribute names can differ between OpenTelemetry semantic-convention versions and between OpenTelemetry and Prometheus export formats, so confirm the names at the scrape or ingestion endpoint before copying a query into an alert.

After rollout, look for UUIDs, numeric IDs, hashes, dates, and usernames that remain in `http_route`. Add explicit patterns for important endpoints and lower the segment threshold only after considering how much legitimate static route diversity would be collapsed.

## Conclusion

Normalize at Beyla before the metric reaches Prometheus. Explicit patterns provide immediate, meaningful routes; `low-cardinality` is an adaptive fallback with per-segment cardinality control; and raw path attributes should remain excluded. Validate the resulting label set with real traffic and repeat the review whenever an API introduces new dynamic path shapes.

## Official Documentation

- [Configure the Beyla routes decorator](https://grafana.com/docs/beyla/latest/configure/routes-decorator/)
- [Configure Beyla service-specific route matching](https://grafana.com/docs/beyla/latest/configure/service-discovery/#custom-route-matching-rules)
- [Configure Beyla metric and trace attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Beyla metrics cardinality](https://grafana.com/docs/beyla/latest/cardinality/)
- [OpenTelemetry HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/)
