# How to Copy Kubernetes Service and Pod Labels onto Prometheus Metrics with ServiceMonitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes Labels, Metrics, Observability

Description: Use ServiceMonitor `targetLabels`, `podTargetLabels`, and `jobLabel` to attach stable Kubernetes ownership metadata to scraped metrics.

---

Kubernetes discovery exposes many labels temporarily, but Prometheus does not copy every Service and Pod label onto every sample. That default prevents uncontrolled cardinality. A ServiceMonitor lets you opt in specific labels:

- `targetLabels` copies labels from the selected Service;
- `podTargetLabels` copies labels from the endpoint's backing Pod;
- `jobLabel` chooses one Service label as the Prometheus `job` value.

These fields live at `ServiceMonitor.spec`, not inside an individual endpoint.

## Copy a Small Stable Label Set

Suppose a Service carries ownership and environment:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: checkout
  labels:
    app.kubernetes.io/name: checkout
    team: commerce
    environment: production
    monitoring-job: checkout-api
spec:
  selector:
    app.kubernetes.io/name: checkout
  ports:
    - name: metrics
      port: 9090
      targetPort: metrics
```

The Pods carry a release version:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: checkout
    app.kubernetes.io/version: "2.7.1"
```

Copy only the intended keys:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: checkout
  namespace: checkout
  labels:
    prometheus: platform
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout
  jobLabel: monitoring-job
  targetLabels:
    - team
    - environment
  podTargetLabels:
    - app.kubernetes.io/version
  endpoints:
    - port: metrics
```

The resulting scraped series receive target labels derived from those objects. Prometheus 3 accepts UTF-8 label names, but Kubernetes discovery meta-label suffixes and the Operator's generated target-label names still replace characters outside `[A-Za-z0-9_]` with underscores. For example, the Operator maps `app.kubernetes.io/version` to `app_kubernetes_io_version`. Verify the actual target label name before writing dashboards.

If the Service lacks `monitoring-job`, `jobLabel` falls back to the associated Service name. If a requested source label is absent or empty, that generated copy rule does nothing; there is no automatic fallback to the same-named label on another object.

## Know Which Object Owns Each Value

`targetLabels` always reads the associated Service:

```yaml
targetLabels:
  - team
```

Adding `team=commerce` only to the Deployment or Pods does not satisfy it.

`podTargetLabels` reads the Pod behind the discovered endpoint:

```yaml
podTargetLabels:
  - app.kubernetes.io/version
```

For selectorless Services backed by external addresses, there may be no Pod `targetRef`, so Pod labels cannot be copied.

When scraping manually managed EndpointSlices, set `serviceDiscoveryRole: EndpointSlice` on the ServiceMonitor (or configure that role globally on Prometheus or PrometheusAgent) and link each slice to the Service with `kubernetes.io/service-name`. Use Service labels or explicit relabeling for metadata the discovered target actually exposes.

When different Pods behind one Service have different versions, `podTargetLabels` preserves that per-target distinction. A Service-level version label cannot express a mixed rollout accurately.

## Use Stable, Controlled Labels

Good copied labels usually come from stable or operationally controlled vocabularies:

- team or owner;
- environment;
- region or cluster tier;
- application version, when release-level filtering justifies a vocabulary that grows over time;
- workload component.

Avoid copying labels that change for every Pod or deployment revision unless queries genuinely need them:

- `pod-template-hash`;
- controller revision hashes;
- build IDs with unbounded values;
- request, session, or customer identifiers;
- timestamps encoded as labels.

Every unique combination of metric name and final label set is a separate Prometheus time series. A high-cardinality target label adds an expensive dimension to every exported metric, and changing that label gives every affected metric series a new identity.

Use the standard `pod`, `namespace`, `service`, `endpoint`, `job`, and `instance` labels normally produced by the Operator and Prometheus where present. Inspect live targets before duplicating them under another name.

## Resolve Exporter Label Conflicts Deliberately

Copied values become target labels. If an exporter emits a sample with the same label name, Prometheus's `honor_labels` behavior decides the conflict.

With the default `honorLabels: false`, Prometheus keeps the target label and prefixes the exporter's conflicting label with `exported_`, repeating the prefix if needed to avoid another collision. With `honorLabels: true`, the exporter value wins on the conflicting sample, so that sample does not receive the target value.

Use unique ownership names when possible:

```yaml
targetLabels:
  - platform_team
  - deployment_environment
```

Kubernetes label keys must actually use those names for the direct fields. If you need to copy `team` into a differently named Prometheus label such as `platform_team`, use target relabeling instead.

## Rename or Derive a Label with `relabelings`

Direct copy fields use the source key as the destination name after underscore sanitization. For a renamed destination, use a discovery meta label:

```yaml
endpoints:
  - port: metrics
    relabelings:
      - action: replace
        sourceLabels:
          - __meta_kubernetes_service_label_team
        targetLabel: platform_team
```

Target relabeling runs before the scrape. The `__meta_kubernetes_service_label_team` value is available during target relabeling and is removed afterward, so copy it to a durable label without the `__` prefix.

Prefer `targetLabels` and `podTargetLabels` for straightforward same-name copies. They document intent at the ServiceMonitor level and avoid repeating rules across endpoints.

## Verify the Result and Cardinality

Open Prometheus **Status > Targets** and expand the target labels. Then query a known metric:

```promql
count by (team, environment, app_kubernetes_io_version) (
  up{job="checkout-api"}
)
```

If a label is absent, check the source object first:

```bash
kubectl get service checkout -n checkout --show-labels
kubectl get pods -n checkout \
  -l app.kubernetes.io/name=checkout \
  --show-labels
```

If target labels are correct but a scraped series contains `exported_team`, investigate a conflict from the exporter, the endpoint's `honorLabels` setting, and any Prometheus or PrometheusAgent `overrideHonorLabels` setting.

Measure series growth before and after adding labels. A target label adds one value to each affected sample rather than duplicating it, but adding or changing that label gives the affected series new identities and creates historical-series churn.

## Official Documentation

- [Prometheus Operator ServiceMonitorSpec API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator RelabelConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.RelabelConfig)
- [Prometheus Kubernetes discovery labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)

## Conclusion

Use `targetLabels` for Service metadata, `podTargetLabels` for backing-Pod metadata, and `jobLabel` for a Service-owned job identity. Copy a small, stable set, expect Kubernetes label-name sanitization, and use `relabelings` when the Prometheus destination name must differ. Verify live target labels and series growth before making the labels a dashboard contract.
