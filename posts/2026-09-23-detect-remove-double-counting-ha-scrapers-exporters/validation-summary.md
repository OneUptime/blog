# Validation Summary: How to Remove Double Counting from HA Scrapers and Duplicate Exporters

## Status
validated

## Post Type
Technical guide with PromQL examples, Prometheus configuration, and a Thanos CLI command.

## Technologies Covered
- Prometheus metrics, external labels, counters, and gauges
- PromQL selectors, aggregation, and rate calculations
- Thanos Query and Sidecar HA deduplication
- Grafana Mimir remote-write HA tracking
- Exporter ownership and monitoring failover

## Sources Consulted
- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus exporter guidance: https://prometheus.io/docs/instrumenting/writing_exporters/
- Thanos Query documentation, including deduplication, API parameters, and CLI flags: https://thanos.io/tip/components/query.md/
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- Grafana Mimir HA deduplication: https://grafana.com/docs/mimir/latest/configure/configure-high-availability-deduplication/
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
1. **External labels and local storage were conflated.** The series-identity explanation suggested that the configured replica labels keep observations separately stored in Prometheus. Clarified that they distinguish observations in the global view, while external labels are not added to each replica's locally stored series. This preserves the correct series-identity rule without implying that local PromQL exposes external labels.
2. **Raw-query comparison needed an ingestion-deduplication boundary.** The final diagnostic instruction did not distinguish Thanos query-time deduplication from Mimir ingestion deduplication. Restricted that comparison to query-time deduplication, supplied Thanos's `dedup=false` parameter, and explained that discarded ingestion samples require inspection at the source replicas.

## Review Notes
- Reviewed all four PromQL examples against the official selector, aggregation, comparison, and function semantics. The two `count` queries identify candidate series groups, not equal values or proven duplicate measurements. The database example correctly states its dimension assumptions.
- Confirmed the YAML placement and mapping syntax of `global.external_labels`. Both HA collectors must identify the same targets consistently, with replica identity as their distinguishing external label.
- Confirmed `thanos query`, `--query.replica-label`, and repeated `--endpoint` arguments in current Thanos documentation. The example is correctly presented as a deployment fragment; endpoint resolution, running sidecars, and security configuration remain deployment prerequisites.
- Thanos merges series whose remaining labels match. The default penalty algorithm supports HA gap handling; the chain algorithm is not an interchangeable HA-scraper deduplication policy. Removing workload identity labels can incorrectly merge independent measurements.
- Mimir elects an ingestion replica per HA cluster. Its default replica label is `__replica__`, whereas this post's Thanos example uses `replica`; the existing instruction to verify backend label configuration is therefore material.
- Confirmed rate-before-sum ordering and counter-reset handling. Dividing by a fixed replica count, averaging asynchronous observations, or taking the maximum before computing rates does not provide general HA deduplication.
- Confirmed exporter guidance against mixing component values and their total in one summable metric. Independent exporter timing or caching can prevent interchangeability even for a shared resource.
- The final workload-scaling check assumes added workers contribute additional traffic. Redistributing a fixed request load across more workers should preserve the service total.
- All existing external links resolved to the intended documentation or author profile. No pinned software versions are claimed; Thanos `tip` and other `latest` documentation are moving references.
- Validation was documentation-based. No live Prometheus, Thanos, Mimir deployment, or failover workload was executed.
