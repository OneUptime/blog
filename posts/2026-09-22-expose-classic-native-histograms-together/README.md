# How to Expose Classic and Native Prometheus Histograms Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Go, Monitoring, Migration, Observability

Description: Expose classic and native histogram representations from one instrument and retain both safely during a Prometheus migration.

---

A migration can keep existing classic histogram dashboards working while introducing native histogram queries. Instrument each observation once, configure the client to maintain both representations, and tell Prometheus to retain the classic components during the transition.

The two representations describe the same events. They are useful for comparison, but combining their counts produces double-counted traffic.

## Use one histogram instrument

The Go client's [HistogramOpts](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus#HistogramOpts) allows classic bucket boundaries and native bucket resolution on one histogram:

```go
package main

import (
    "log"
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    registry := prometheus.NewRegistry()
    latency := prometheus.NewHistogram(prometheus.HistogramOpts{
        Name: "rpc_duration_seconds",
        Help: "Completed RPC duration.",
        Buckets: []float64{0.01, 0.05, 0.1, 0.5, 1.0},
        NativeHistogramBucketFactor: 1.1,
    })
    registry.MustRegister(latency)
    latency.Observe(0.08)
    latency.Observe(0.32)

    http.Handle("/metrics", promhttp.HandlerFor(registry,
        promhttp.HandlerOpts{EnableOpenMetrics: true}))
    log.Fatal(http.ListenAndServe("127.0.0.1:8000", nil))
}
```

Use a pinned current client version. `Buckets` defines the classic layout; `NativeHistogramBucketFactor` requests native exponential resolution. The client's API documentation describes the actual supported bucket factors and additional native histogram resource controls.

Do not register two unrelated collectors with the same metric name and label set. A single instrument keeps count and sum aligned and lets the supported serializer expose both components consistently. In a real service, call `Observe` once when an RPC completes, using the same stable label dimensions for every observation.

## Negotiate the representation that carries both

For this established native histogram path, use Prometheus protobuf. OpenMetrics 1.0 text can show classic components but cannot carry native histogram samples. A text-only curl response therefore does not establish that the exporter lacks native data.

On a contemporary Prometheus installation supporting the current per-job settings:

```yaml
scrape_configs:
  - job_name: rpc-migration
    scrape_native_histograms: true
    always_scrape_classic_histograms: true
    scrape_protocols:
      - PrometheusProto
      - OpenMetricsText1.0.0
      - PrometheusText0.0.4
    static_configs:
      - targets: ["127.0.0.1:8000"]
```

The [scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) explains that classic components accompanying native histograms are otherwise omitted by default. Verify these fields against the installed release; the per-job native-scraping setting belongs to the Prometheus 3.8-and-later configuration model.

Retaining classic components only helps if the exporter supplies real classic boundaries. It does not synthesize a useful finite classic layout from a native-only histogram.

## Compare counts without summing representations

After enough observations and scrapes, compare the event rates:

```promql
sum(rate(rpc_duration_seconds_count{job="rpc-migration"}[5m]))
```

```promql
sum(histogram_count(rate(rpc_duration_seconds{job="rpc-migration"}[5m])))
```

These should describe the same workload. A material discrepancy warrants checking time windows, labels, scraping coverage, resets, and mixed client versions. Avoid adding the two results: they are alternate views of one event stream.

The native series uses the base name while the classic components use suffixed names. That normally avoids a raw time-series name collision. Problems arise when relabeling strips suffixes, recording rules reuse output names, or two scrape jobs intentionally relabel themselves to identical target identity.

Keep the migration job distinguishable from production jobs while testing. If both jobs feed the same remote store, preserve a distinguishing label or use an isolated test destination so the comparison itself does not create duplicate ingestion.

## Expect quantiles to differ

Classic and native histograms use different bucket layouts, so percentile estimates need not be numerically identical. Compare count and sum first to establish event accounting, then compare quantiles against acceptable error around operational thresholds.

The [native histogram specification](https://prometheus.io/docs/specs/native_histograms/) discusses storage, query behavior, and migration. A better-resolved percentile is still an estimate; use known synthetic durations around important boundaries to understand how each representation behaves.

Also inspect memory, scrape size, and storage cost. During dual ingestion you pay for classic components and native samples together. That temporary increase should have a rollout purpose and an end condition.

## Retire classic components after consumers migrate

Inventory recording rules, alerts, dashboards, federation, and remote-write receivers using `_bucket`, `_sum`, or `_count`. Migrate and verify them before disabling classic retention. The [histogram function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/) documents helpers such as `histogram_count`, `histogram_sum`, and `histogram_quantile` for native samples.

Finally set `always_scrape_classic_histograms` to false for the migrated job and confirm native queries still work. Existing classic history remains queryable within retention, while newly written data follows the chosen representation. Remove classic instrumentation only after any other scrapers that still need it have been accounted for.
