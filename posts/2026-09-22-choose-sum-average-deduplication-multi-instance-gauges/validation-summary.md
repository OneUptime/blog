# Validation Summary: How to Decide Whether a Multi-Instance Gauge Should Be Summed, Averaged, or Deduplicated

## Status

validated

## Post Type

Technical guide with PromQL examples.

## Technologies Covered

- Prometheus gauges and scrape jobs
- PromQL aggregation and vector arithmetic
- Thanos Query high-availability deduplication
- Capacity-weighted utilization and telemetry freshness

## Sources Consulted

- [Prometheus metric types: Gauge](https://prometheus.io/docs/concepts/metric_types/#gauge)
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [PromQL aggregation operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [PromQL querying basics: Staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [PromQL rate function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus recording-rule practices](https://prometheus.io/docs/practices/rules/)
- [Thanos Query: Deduplication](https://thanos.io/tip/components/query.md/#deduplication)
- [Author profile on GitHub](https://github.com/nawazdhandala): checked the author link destination.

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all five PromQL code blocks against the documented syntax and semantics. The selectors, grouping clauses, division, and subtraction are valid. The two binary expressions produce matching label sets on their respective sides.
- Summing process-owned connections is correct under the stated ownership and collection assumptions. Duplicate collection can inflate a sum when both observations pass its selector. The explicit job filter in the example excludes observations with other job label values.
- The sensor average gives equal weight to each selected series. Missing sensors and multiple sensors per machine can change the represented population, as the post explains.
- Checked the arithmetic: 3 + 7 = 10; two repeated readings of 20 describe a single 20-message queue; the unweighted utilization average is 75 percent, while combined utilization is (1 + 8) / (2 + 8) = 0.9. The utilization expression returns a ratio, equivalent to 90 percent when formatted as a percentage. Matching populations remain necessary even when cluster labels match.
- The maximum and spread examples correctly describe selection by value and disagreement. Equal readings yield zero spread; a single remaining observer also yields zero, so reporter count is a separate check.
- Instant selectors use the latest eligible samples within lookback and respect staleness. They do not provide a synchronized inventory or implicitly replace missing resources with zero. This supports the freshness caveats in the post.
- The gauge definition and warning against counter-style rate() are correct.
- Thanos deduplication combines series that differ only in configured replica labels. It requires appropriate HA replica labeling; it does not determine application resource ownership automatically. The post correctly distinguishes this from choosing a maximum among queue observers.
- All external links in the post resolved to the intended resources. The Thanos tip and Prometheus latest URLs are rolling documentation; no specific software release is claimed, and the examples use established operators without experimental features.
- This was a documentation-based review with manual arithmetic checks. The queries were not executed against a live Prometheus or Thanos deployment; the illustrative metric names require matching instrumentation and labels.
- README.md was left unchanged because no technical corrections were necessary. There are no terminal commands or configuration snippets to validate.
