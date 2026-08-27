# `relabelings` vs `metricRelabelings` in ServiceMonitor: When Does Each Run?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Relabeling, Metrics, Kubernetes

Description: Place ServiceMonitor relabel rules at the correct stage by separating target discovery metadata from samples returned by the metrics endpoint.

---

ServiceMonitor exposes two lists with the same relabel-rule shape but different inputs and execution times:

```text
Kubernetes discovery
  -> endpoints[].relabelings
  -> HTTP scrape
  -> endpoints[].metricRelabelings
  -> sample and label limits
  -> TSDB ingestion
```

Use `relabelings` to decide which targets to scrape and how Prometheus contacts or labels them. Use `metricRelabelings` to transform or discard samples returned by a successful scrape.

## Target Relabeling Runs Before the Request

`relabelings` operates on each discovered target's label set. At this stage, Kubernetes service discovery provides temporary labels such as:

- `__meta_kubernetes_namespace`;
- `__meta_kubernetes_service_name`;
- `__meta_kubernetes_service_label_<labelname>`;
- Pod and endpoint metadata for the active discovery role;
- special scrape labels such as `__address__`, `__scheme__`, and `__metrics_path__`.

This rule drops every target whose Service has `environment=development`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
    - port: metrics
      relabelings:
        - action: drop
          sourceLabels:
            - __meta_kubernetes_service_label_environment
          regex: development
```

The HTTP request is never sent to dropped targets. This is useful for target selection, sharding, copying discovery metadata, or changing special request labels.

Temporary labels beginning with `__` are removed after target relabeling. If a discovery value should become a durable target label, copy it to an ordinary label:

```yaml
relabelings:
  - action: replace
    sourceLabels:
      - __meta_kubernetes_namespace
    targetLabel: kubernetes_namespace
```

Prometheus Operator already adds relabeling for several standard Kubernetes fields. Inspect the generated target before adding a duplicate label.

## Metric Relabeling Runs on Returned Samples

`metricRelabelings` runs after Prometheus has contacted the target and parsed its exposition response, immediately before ingestion. This rule drops Go runtime metrics:

```yaml
endpoints:
  - port: metrics
    metricRelabelings:
      - action: drop
        sourceLabels:
          - __name__
        regex: 'go_.*'
```

This saves storage and downstream processing, but it does not reduce response bytes or work performed by the target. Prometheus still downloads and parses the samples.

Metric relabeling can also remove a label from every returned sample:

```yaml
metricRelabelings:
  - action: labeldrop
    regex: 'request_id|session_id'
```

Use that only after checking uniqueness. Removing a distinguishing label can collapse multiple samples in one scrape onto the same final label set, which can cause duplicate-series errors or destroy useful dimensions.

Prometheus documents that metric relabeling does not apply to automatically generated series such as `up`. A rule intended to drop `up` will not work here.

## The Same Rule in the Wrong List Fails Quietly

This cannot select targets when placed under `metricRelabelings`:

```yaml
sourceLabels:
  - __meta_kubernetes_namespace
```

The `__meta_*` discovery labels are target-relabel inputs and are gone by metric-relabel time unless copied to durable labels.

Likewise, this cannot match an exporter metric under `relabelings`:

```yaml
sourceLabels:
  - __name__
regex: http_requests_total
```

No scraped metric names exist before the request. The rule sees only the target label set.

Use this decision test:

| Goal | Correct field |
| --- | --- |
| Drop a discovered Pod before scraping | `relabelings` |
| Copy a Kubernetes Service label to target labels | `targetLabels` or `relabelings` |
| Rewrite target address, path, or scheme | `relabelings` |
| Drop an expensive metric family | `metricRelabelings` |
| Remove or rename a label on scraped samples | `metricRelabelings` |
| Fix an HTTP timeout or authentication failure | Neither; repair the scrape request or target |

## Understand CRD Names and Generated Prometheus Names

The ServiceMonitor uses camelCase fields:

```yaml
relabelings:
metricRelabelings:
```

Prometheus's generated YAML uses:

```yaml
relabel_configs:
metric_relabel_configs:
```

Do not paste raw Prometheus field names into a ServiceMonitor. Use `kubectl explain servicemonitor.spec.endpoints.relabelings` to inspect the installed CRD schema.

Rules run in list order. A later rule sees changes made by an earlier rule. `sourceLabels` values are concatenated with `separator`, matched against `regex`, and processed according to `action`. Default values exist, but explicit `action`, `sourceLabels`, `regex`, and `targetLabel` make production rules easier to review.

## Relabeling and Limits Interact

Target relabeling runs before `targetLimit`, so dropping unwanted targets can bring the accepted set under the limit. Metric relabeling runs before `sampleLimit` and label limits, so dropping expensive series or labels changes the values evaluated by those limits.

Limits remain guardrails, not a replacement for careful relabeling. Exceeding a sample or label limit fails the scrape rather than keeping the first N samples.

## Validate with Discovery and Query Evidence

Before a change, capture:

- active and dropped targets on **Status > Service Discovery**;
- the target labels on **Status > Targets**;
- `scrape_samples_scraped` and `scrape_samples_post_metric_relabeling` for the job;
- representative series and label sets from queries.

After applying the rule, confirm that the intended boundary changed. A target rule should change active or dropped target sets. A metric rule should change post-relabel sample counts or stored series while the target remains active.

Inspect rejection Events if the rule cannot be translated:

```bash
kubectl get events -n monitoring \
  --field-selector=involvedObject.kind=ServiceMonitor,involvedObject.name=api \
  --sort-by=.lastTimestamp
```

Invalid regular expressions and unsupported actions should be fixed in the resource, not worked around by editing generated Prometheus configuration.

## Official Documentation

- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator RelabelConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.RelabelConfig)
- [Prometheus target relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus metric relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus Kubernetes discovery labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)

## Conclusion

`relabelings` transforms discovery targets before any network request, while `metricRelabelings` transforms returned samples just before ingestion. Kubernetes `__meta_*` labels belong to the first stage, and metric names belong to the second. Put each rule where its inputs exist, then verify the corresponding target or sample-count change.
