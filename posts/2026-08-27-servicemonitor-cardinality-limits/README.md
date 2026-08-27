# Limit ServiceMonitor Cardinality with Sample, Target, and Label Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Cardinality, Metric, Reliability

Description: Apply ServiceMonitor sample, target, and label guardrails with correct failure semantics, version requirements, and capacity-planning measurements.

---

ServiceMonitor limits protect Prometheus from unexpectedly large scrapes, target sets, and label payloads. They are circuit breakers, not silent truncation controls. When a configured threshold is exceeded, Prometheus fails targets or the whole scrape according to the limit.

A practical baseline looks like:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: checkout
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: checkout
  sampleLimit: 12000
  targetLimit: 100
  labelLimit: 60
  labelNameLengthLimit: 100
  labelValueLengthLimit: 500
  endpoints:
    - port: metrics
```

The numbers are examples, not universal recommendations. Derive them from observed healthy behavior plus explicit headroom.

## What Each Limit Measures

### `sampleLimit`

`sampleLimit` is the maximum number of scraped samples accepted per scrape. Prometheus evaluates it after metric relabeling. If the response still contains more samples than the limit, the entire scrape fails. Prometheus does not keep the first N samples.

This protects against an exporter suddenly adding thousands of series. It does not directly cap retained historical cardinality because a target can expose a different set of label values on every scrape while remaining under the per-scrape count.

The queries below assume the resulting target label is `job="checkout"`. By default, a ServiceMonitor uses the selected Service's name unless `jobLabel` selects another Service label; substitute the value shown for your targets.

Useful self-metrics include:

```promql
max_over_time(scrape_samples_scraped{job="checkout"}[7d])
```

and:

```promql
max_over_time(scrape_samples_post_metric_relabeling{job="checkout"}[7d])
```

Compare the two values from the same scrape to see how many samples metric relabeling removes. The independent seven-day maxima can occur at different times, so do not subtract those maxima to calculate the removal count. Set the limit above normal post-relabel peaks and expected rollout growth.

### `targetLimit`

`targetLimit` caps unique targets accepted for the generated scrape configuration after target relabeling. If more targets remain after target relabeling, Prometheus marks every target in that scrape pool as failed without scraping any of them. Upstream Prometheus documents target limiting as experimental behavior that can change.

`targetLimit` requires Prometheus 2.21 or newer. Confirm the Prometheus version that the Operator is generating configuration for before adding the field.

This catches an accidentally broad Service selector or namespace scope. It does not limit samples per target.

Count the current active series source cautiously:

```promql
count(up{job="checkout"})
```

That query counts currently represented target series for the job, including down targets. Compare it with active and dropped target lists because relabeling and stale series can affect interpretation.

### `labelLimit`

`labelLimit` caps the number of labels accepted on an individual sample after metric relabeling. If any sample in the scrape exceeds it, the entire scrape fails. It requires Prometheus 2.27 or newer.

This protects against very wide samples. It does not prevent a single allowed label from having millions of distinct values over time.

### Label name and value length

`labelNameLengthLimit` and `labelValueLengthLimit` cap each label name and value after metric relabeling. Prometheus measures lengths in bytes, so non-ASCII characters can use more than one byte. These fields also require Prometheus 2.27 or newer.

A single violating name or value fails the scrape. Use these limits to catch accidental payloads such as stack traces, URLs with query strings, or serialized objects placed in labels.

## Limits Do Not Solve Cardinality Alone

Prometheus series cardinality is the number of unique metric-name and label-set combinations. Each guardrail controls only part of that system:

| Risk | Useful control |
| --- | --- |
| Too many series in one response | `sampleLimit`, metric relabeling, exporter configuration |
| Too many discovered Pods or endpoints | `targetLimit`, selective Service labels, target relabeling |
| Too many labels on one sample | `labelLimit` |
| Huge label strings | name and value length limits |
| Unbounded values under allowed counts | remove the label, bucket or aggregate at source, metric relabeling |
| Huge response body with few parsed samples | `bodySizeLimit`, requires Prometheus 2.28 or newer |

For example, `user_id` adds only one label to a sample and easily stays under `labelLimit`, but millions of values create millions of time series. No numeric label-count limit fixes that data-model choice.

## Reduce Waste Before Setting the Breaker

Drop metrics that are never queried before applying a tight sample limit:

```yaml
spec:
  sampleLimit: 12000
  endpoints:
    - port: metrics
      metricRelabelings:
        - action: drop
          sourceLabels:
            - __name__
          regex: 'debug_.*|temporary_.*'
```

Metric relabeling runs before `sampleLimit`, so this reduces the evaluated sample count. It does not reduce bytes downloaded or exporter work. Prefer disabling unneeded collector families at the exporter when possible.

Use target relabeling or a narrower Service selector before relying on `targetLimit`. The limit should catch a regression, not define normal discovery by repeatedly failing the entire scrape pool.

## Set Administrator-Enforced Ceilings

`Prometheus` and `PrometheusAgent` CRs provide instance-wide fields including:

- `enforcedSampleLimit`;
- `enforcedTargetLimit`;
- `enforcedLabelLimit`;
- `enforcedLabelNameLengthLimit`;
- `enforcedLabelValueLengthLimit`.

These let platform administrators cap ServiceMonitor, PodMonitor, and Probe values. A more restrictive positive limit on an individual monitor is retained; a monitor cannot raise itself above the enforced ceiling.

The CommonPrometheusFields API also has global limit behavior whose generated value differs for Prometheus versions before and after 2.45. Always check the Operator API reference for the installed version and inspect the generated configuration when combining defaults, enforced fields, and per-monitor values.

An enforced limit of zero disables that enforced ceiling; positive per-monitor or Prometheus-level global limits can still apply. If all applicable limit fields are omitted or zero, Prometheus has no limit by default.

## Roll Out Limits Without Creating an Outage

1. Measure at least one representative traffic and deployment cycle.
2. Separate jobs with genuinely different exporter sizes.
3. Remove known waste at the exporter or with metric relabeling.
4. Set a threshold above the observed peak and planned growth.
5. Apply to a canary Prometheus or a small monitor subset.
6. Alert on scrape failures and watch target errors.
7. Tighten gradually after confirming headroom.

When a limit trips, the result is missing current metrics, not a cheaper partial scrape. Alerting rules can become absent or stale. Pair limits with alerts on `up`, scrape health, and unexpected changes in sample counts.

Do not set the exact current maximum. Rolling updates can temporarily double target counts, exporters can add legitimate metrics during an upgrade, and label sets can expand with new stable dimensions.

## Diagnose a Tripped Limit

Prometheus **Status > Targets** reports scrape errors. Compare:

```promql
scrape_samples_scraped{job="checkout"}
```

```promql
scrape_samples_post_metric_relabeling{job="checkout"}
```

```promql
count(up{job="checkout"})
```

Inspect the raw endpoint only in a safe environment and avoid loading a massive response into shared tooling. Identify whether a new metric family, target explosion, label copy, or unbounded label value caused the change. Raise a threshold only when the new load is understood and capacity has been evaluated.

## Official Documentation

- [Prometheus Operator ServiceMonitorSpec limits](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator CommonPrometheusFields enforced limits](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.CommonPrometheusFields)
- [Prometheus scrape limits](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus metric relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)

## Conclusion

Use `sampleLimit` for post-relabel samples, `targetLimit` for discovered targets, and label count and length limits for sample width. Exceeding them fails work rather than truncating it, so measure first and leave headroom. Combine guardrails with exporter controls, selective discovery, and metric relabeling because no single limit caps total time-series cardinality.
