# Validation Summary: How High-Cardinality Host Labels Inflate Metrics Cost—and What to Drop at Ingest

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus metric relabeling and target relabeling
- Prometheus remote write
- Prometheus TSDB and cardinality statistics API
- Prometheus node_exporter
- YAML scrape configuration

## Sources Consulted

- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- Prometheus metric and label naming guidance: https://prometheus.io/docs/practices/naming/
- Prometheus jobs, instances, and automatically generated scrape metrics: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus TSDB statistics API: https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- Prometheus scrape configuration, relabeling actions, metric relabeling, scrape limits, and remote-write relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus local storage and TSDB block behavior: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus v3.13.2 source and release, including scrape-cache handling of `scrape_series_added`: https://github.com/prometheus/prometheus/tree/v3.13.2/scrape and https://github.com/prometheus/prometheus/releases/tag/v3.13.2
- Prometheus node_exporter collector filtering documentation: https://github.com/prometheus/node_exporter#include--exclude-flags
- Prometheus node_exporter v1.12.1 release: https://github.com/prometheus/node_exporter/releases/tag/v1.12.1

## Issues Found

- The churn explanation said that a superseded series remains in historical blocks. A recent series can remain in Prometheus's mutable head before it is compacted into a persistent block, so the text now says that the old series remains queryable for earlier time ranges until retention removes it.
- `scrape_series_added` was labeled simply as new series per scrape and an abrupt increase was described as a churn signal without qualification. Prometheus documents this metric as an approximate count, and its implementation derives the count from per-target scrape caches. The text now identifies it as approximate, recommends investigating sustained or unexpected increases, and notes that it can spike after a Prometheus restart while those caches are rebuilt.

## Review Notes

- All four PromQL expressions were syntax-checked successfully with `promtool` v3.13.2.
- The combined scrape configuration containing all relabel rules and scrape limits was syntax-checked successfully with `promtool` v3.13.2.
- The node_exporter collector exclusion flags were checked against node_exporter v1.12.1 `--help`; the `collect[]` and `exclude[]` scrape parameters were checked against the current upstream README.
- Every external link in the post returned HTTP 200 during validation.
