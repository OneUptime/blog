# How to Diagnose Missing Native Histograms in Prometheus Scrapes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Observability, DevOps

Description: Diagnose missing native histograms by separating negotiated wire format, ingestion settings, classic fallback, and query shape.

---

A missing histogram after disabling native histogram scraping does not necessarily mean the exporter stopped exposing data. The negotiated protocol may contain only classic buckets, Prometheus may ignore native components, or a dashboard may still query the native family name after storage changed to classic series.

Trace one metric through the exporter, HTTP representation, stored sample type, and query. Those four checkpoints identify the failure much faster than changing bucket settings blindly.

## Establish which histogram representation exists

Classic histograms use several float series, such as `rpc_duration_seconds_bucket`, `_sum`, and `_count`. A native histogram is stored as a histogram sample under the base name `rpc_duration_seconds`.

OpenMetrics 1.0 text does not encode native histogram samples. An endpoint commonly described as “OpenMetrics” may also support Prometheus protobuf, and it is that negotiated representation that carries native components in an established deployment. The [native histogram specification](https://prometheus.io/docs/specs/native_histograms/) explains the representation and scraping behavior. Do not infer native support from an endpoint name or from `# TYPE ... histogram` alone.

Capture a text view deliberately:

```bash
curl -fsS -D metrics.headers -o metrics.om \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  http://exporter.internal:9000/metrics
```

This shows the classic OpenMetrics representation, if supported. It does not prove which representation Prometheus negotiated on its own scrape. Inspect the actual target configuration, exporter capabilities, and HTTP exchange before concluding native data is absent at the source.

## Inspect the effective scrape settings

For current Prometheus versions supporting these options, native ingestion can be configured per job:

```yaml
scrape_configs:
  - job_name: rpc-workers
    scrape_native_histograms: true
    always_scrape_classic_histograms: true
    scrape_protocols:
      - PrometheusProto
      - OpenMetricsText1.0.0
      - PrometheusText0.0.4
    static_configs:
      - targets: ["exporter.internal:9000"]
```

This example targets the current configuration model introduced for native scraping in Prometheus 3.8; check the installed version before copying it into older releases. The [configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) documents the settings and how they interact.

If a job explicitly restricts `scrape_protocols` to OpenMetrics 1.0, enabling native ingestion cannot manufacture native samples from that wire format. Either negotiate protobuf with an exporter that supports it, or deliberately convert classic histograms using the separate `convert_classic_histograms_to_nhcb` setting.

## Understand what disabling native scraping leaves

When `scrape_native_histograms` is false, Prometheus ignores native components and processes the available classic components. For a combined histogram with explicit classic boundaries, those classic bucket series remain available unless `convert_classic_histograms_to_nhcb` is enabled without `always_scrape_classic_histograms: true`.

A native-only protobuf histogram is subtler: its count and sum can yield a degenerate classic representation with only a `+Inf` bucket. That preserves some aggregate information but provides no useful finite bucket resolution. It is therefore incorrect to promise that disabling native ingestion always drops the entire family, or that it always preserves a useful classic histogram.

`always_scrape_classic_histograms: true` retains classic components when they are available alongside native components. It does not reconstruct a rich classic bucket layout from a native-only exporter. If legacy dashboards need classic buckets, configure the instrumentation to expose them.

## Match the query to the stored shape

Check native and classic forms independently:

```promql
rpc_duration_seconds{job="rpc-workers"}
```

```promql
rpc_duration_seconds_bucket{job="rpc-workers"}
```

A native p95 query uses the base family:

```promql
histogram_quantile(0.95, sum(rate(rpc_duration_seconds[5m])))
```

A classic p95 query preserves the bucket boundary:

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(rpc_duration_seconds_bucket[5m]))
)
```

The [PromQL function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile) distinguishes these forms. Changing storage representation without migrating the query can look like data loss even when ingestion is healthy.

Allow several scrapes and a sufficiently populated range before judging a rate expression. During a rollout, also filter by instance to identify replicas still exposing a different representation.

## Separate ingestion failures from absent queries

Inspect `up`, the target's last scrape error, and sample ingestion diagnostics. An unsupported content type, invalid histogram, or response-size limit can fail the scrape itself. Metric relabeling can also remove bucket series after successful parsing.

If local queries work but remote dashboards do not, check whether remote write sends native histograms and whether the destination supports them. Verify the receiver's stored sample type rather than assuming local success proves end-to-end compatibility.

A useful repair is explicit: restore supported protocol negotiation, enable the desired ingestion mode, expose any required classic layout, and update the corresponding query. Preserve a canary job until both data shape and dashboard behavior are confirmed.
