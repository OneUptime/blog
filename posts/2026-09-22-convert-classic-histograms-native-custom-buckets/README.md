# How to Convert Classic Histogram Buckets to Native Histograms During Prometheus Scraping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Convert classic histogram scrapes into native histograms with custom buckets while preserving boundaries and migrating queries deliberately.

---

Prometheus can convert a scraped classic histogram into a native histogram with custom buckets, commonly called an NHCB. This changes the storage representation while preserving the explicit bucket boundaries supplied by the exporter.

It does not infer finer-grained observations or turn the source into an exponential histogram. If a classic bucket covers 0.1 through 0.5 seconds, conversion cannot discover where within that interval each request fell.

## Start with a complete classic histogram

An exporter can continue serving OpenMetrics 1.0:

```text
# TYPE task_duration_seconds histogram
# HELP task_duration_seconds Completed task duration.
task_duration_seconds_bucket{queue="default",le="0.1"} 2
task_duration_seconds_bucket{queue="default",le="0.5"} 5
task_duration_seconds_bucket{queue="default",le="+Inf"} 6
task_duration_seconds_count{queue="default"} 6
task_duration_seconds_sum{queue="default"} 2.4
# EOF
```

Before conversion, verify cumulative nonnegative integer bucket counts, unique ordered boundaries, `+Inf` matching count, and consistent labels. A malformed classic histogram does not become correct because its storage target changes.

The [native histogram specification](https://prometheus.io/docs/specs/native_histograms/#scraping-classic-histograms-as-nhcbs) explains NHCB conversion and its tradeoffs. The custom layout is useful when existing boundaries encode service objectives or when exponential spacing is a poor fit for the measurement.

## Enable conversion on a canary job

On a contemporary Prometheus release supporting these options:

```yaml
scrape_configs:
  - job_name: task-nhcb-canary
    convert_classic_histograms_to_nhcb: true
    always_scrape_classic_histograms: true
    scrape_protocols:
      - OpenMetricsText1.0.0
      - PrometheusText0.0.4
    static_configs:
      - targets: ["tasks.internal:9000"]
```

This deliberately scrapes classic text and retains the classic components for comparison. Conversion is a separate setting from `scrape_native_histograms`: a classic-only response can be converted even when no native representation is received from the exporter. The [configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) documents those combinations.

Validate the configuration using the `promtool` binary shipped with your deployed Prometheus version before rollout. Unknown-field errors indicate a release mismatch, not a reason to silently remove settings and assume equivalent behavior.

Use a separate Prometheus or a clearly identified canary job. Scraping the same target twice and then aggregating both jobs would double-count the workload in a service-wide query.

## Verify both stored forms

With classic retention enabled, inspect both:

```promql
task_duration_seconds_bucket{job="task-nhcb-canary"}
```

```promql
task_duration_seconds{job="task-nhcb-canary"}
```

The first returns float series per bucket. The second returns native histogram samples under the base name. Compare current counts with:

```promql
task_duration_seconds_count{job="task-nhcb-canary"}
```

```promql
histogram_count(task_duration_seconds{job="task-nhcb-canary"})
```

For a cumulative event histogram, compare count rates as well. Test a controlled exporter restart so conversion and downstream queries are exercised across a reset, not only during a monotonically increasing steady state.

Prometheus does not create an additional NHCB alongside an ingested actual native histogram of the same family, because both would need the same base-name series identity. When an exporter provides both classic and native components and native ingestion is enabled, the actual native representation takes precedence over conversion. Set protocol and ingestion policy intentionally if custom boundaries are the goal.

## Migrate the queries

A classic p95 expression is:

```promql
histogram_quantile(
  0.95,
  sum by (queue, le) (
    rate(task_duration_seconds_bucket{job="task-nhcb-canary"}[5m])
  )
)
```

The NHCB form is:

```promql
histogram_quantile(
  0.95,
  sum by (queue) (
    rate(task_duration_seconds{job="task-nhcb-canary"}[5m])
  )
)
```

The bucket layout travels inside each histogram sample, so the query no longer groups on `le`. See the [PromQL histogram functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile) for the supported sample types and annotations.

Keep layouts consistent across replicas. Reconciliation between custom layouts depends on shared boundaries and can lose resolution when they differ. A rollout that changes bucket boundaries arbitrarily is therefore still a schema change, even though the data now uses native storage.

## Complete the migration deliberately

Check alerts, recording rules, dashboards, federation, and remote-write compatibility before removing classic retention. If local queries work but a downstream destination loses the metric, confirm it accepts native histogram samples and that remote write is configured to send them.

After comparison succeeds, set `always_scrape_classic_histograms: false` to stop ingesting redundant classic components for converted families. Verify that the base-name histogram continues receiving samples and migrated queries remain populated. Historical classic series remain until retention expires; conversion affects new scrapes, not existing TSDB blocks.

The useful outcome is preserved measurement meaning with a different storage and query representation. Judge success by matching event accounting, acceptable quantile behavior, healthy scrapes, and verified downstream consumers—not merely by seeing fewer suffixed series.
