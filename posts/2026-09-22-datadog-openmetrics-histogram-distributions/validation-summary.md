# Validation Summary: How to Turn OpenMetrics Histogram Buckets into Queryable Datadog Distributions

## Status
validated

## Post Type
Technical configuration guide.

## Technologies Covered
- Datadog Agent and the latest OpenMetrics check (V2).
- Datadog distribution metrics and percentile queries.
- Prometheus classic histograms and OpenMetrics text exposition.
- YAML integration configuration.

## Sources Consulted
- [Prometheus histogram guidance](https://prometheus.io/docs/practices/histograms/): cumulative buckets, observation counts and sums, aggregation, and quantile estimation limits.
- [OpenMetrics specification](https://github.com/prometheus/OpenMetrics/blob/main/specification/OpenMetrics.md): histogram semantics, metric suffixes, labels, metadata, and EOF syntax.
- [Datadog OpenMetrics integration documentation](https://docs.datadoghq.com/integrations/openmetrics/): latest versus legacy modes and metric selection and renaming.
- [Official OpenMetrics configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example): namespace, metrics, tags, and histogram conversion options.
- [V2 histogram transformer](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transformers/histogram.py): default count submissions, distribution naming, optional count and sum submissions, and monotonic bucket submission.
- [V2 histogram utilities](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/utils.py): subtraction of adjacent cumulative buckets and construction of interval bounds.
- [Datadog Agent check sampler](https://github.com/DataDog/datadog-agent/blob/main/pkg/aggregator/check_sampler.go): temporal deltas, initial samples, reset handling, and interpolation into sketches.
- [Datadog distributions documentation](https://docs.datadoghq.com/metrics/distributions/): global aggregation, percentile enablement, supported percentiles, and tagging.
- [Datadog Metrics Summary documentation](https://docs.datadoghq.com/metrics/summary/): metric type inspection and percentile configuration.

## Issues Found
No technical issues found.

## Review Notes
- Parsed the YAML example with PyYAML and verified the histogram family mapping. The endpoint is an illustrative service address that must resolve and be reachable from the deployed Agent.
- Parsed the exposition with the Prometheus Python client's OpenMetrics parser. It produces one histogram family. Cumulative bucket counts are ordered, the infinite bucket equals the count of 100, and subtraction yields interval counts of 40, 50, 10, and 0. The sum of 25 seconds is feasible for these bucket counts.
- Confirmed that both histogram conversion flags are valid. Setting both is redundant but correct: retaining counters implicitly enables distribution conversion. The configuration produces the distribution base name and optional `.count` and `.sum` metrics described in the post.
- Confirmed that default histogram components and the optional count and sum use monotonic count submissions. A mean-latency cross-check must compare matching observation increments and time windows; the original endpoint sum is measured in seconds.
- Confirmed that bucket decumulation and temporal deltas are separate operations. First-scrape and reset behavior depend on Agent settings and implementation, so the post appropriately recommends a baseline, increasing workload, and restart canary rather than promising exact recovery across resets.
- Confirmed percentile enablement and the p95 query form. Aggregating distributions across selected producers is distinct from averaging independently calculated percentiles. Source bucket width limits recovered precision even when the resulting distribution supports percentiles.
- Checked the article's technical links against the intended official resources. Datadog documentation was available through indexed official pages when direct retrieval returned errors.
- The post discusses latest mode without pinning a release. Reviewed current official documentation and upstream implementation; installed versions should be checked during deployment. No deprecated configuration is recommended.
- No terminal commands occur in the article. Validation included documentation and source inspection plus local parsing; no live Datadog Agent, exporter workload, restart experiment, or backend percentile query was executed.
- README.md required no changes.
