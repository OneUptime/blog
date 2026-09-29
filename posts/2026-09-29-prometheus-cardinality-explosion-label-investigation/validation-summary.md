# Validation Summary: How to Find Labels Behind Prometheus Cardinality Spikes Before OOM

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands, PromQL queries and YAML configuration.

## Technologies Covered
- Prometheus HTTP API and TSDB head storage
- PromQL aggregation and label cardinality
- Classic and native histograms
- Scrape configuration, metric relabeling and sample limits
- curl, jq and shell redirection

## Sources Consulted
- Prometheus HTTP API, TSDB statistics: https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- Prometheus configuration, metric relabeling and scrape limits: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- PromQL aggregation operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- PromQL selectors, lookback and staleness: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus histogram representations: https://prometheus.io/docs/concepts/metric_types/
- Prometheus storage, blocks and WAL recovery: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus metric and label naming guidance: https://prometheus.io/docs/practices/naming/
- Prometheus head implementation and cardinality caching: https://github.com/prometheus/prometheus/blob/v3.5.0/tsdb/head.go
- Prometheus head self-metric definitions: https://github.com/prometheus/prometheus/blob/main/tsdb/head.go
- Prometheus postings statistics implementation: https://github.com/prometheus/prometheus/blob/main/tsdb/index/postings.go
- curl option reference: https://curl.se/docs/manpage.html
- jq object construction and field selection: https://jqlang.org/manual/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Histogram type was unspecified.** Qualified the series multiplication explanation as applying to classic histograms. Native histograms encode buckets, sum and count together in composite samples.
2. **Metric names were described as complete metric families.** Corrected the TSDB summary explanation and the bucket-query introduction. The API groups by individual metric name; a histogram's bucket, sum and count names are separate entries, and the example query selects only the bucket metric.
3. **Bounded output could be mistaken for bounded computation.** Clarified that `limit=10` limits returned entries while computing statistics still scans the head label index. Adjusted the conclusion to say head-oriented summaries and cautioned against repeated polling during an incident.

## Review Notes
- The endpoint path, query parameter, JSON fields, curl flags and jq object shorthand are valid. The documentation and author links resolve to the intended resources.
- Both PromQL examples use valid aggregation syntax. The nested count measures distinct route groups among series visible to the instant query, rather than all identities retained in the head. A missing route label forms an unlabeled group; these discovery queries assume the candidate label exists on the selected instrumentation.
- The YAML fields and anchored name-matching drop rule are valid. The example deliberately targets a disposable debug metric prefix; it must be adapted to the actual offending metrics and loaded into Prometheus configuration.
- Metric relabeling precedes ingestion and does not aggregate colliding series. `sample_limit` is evaluated after metric relabeling and causes the entire scrape to fail when exceeded; it does not constrain churn over successive scrapes.
- Head series include retained identities that may no longer appear in instant queries. Staleness alone does not immediately remove a series from the head. Compaction and garbage collection affect eventual removal.
- The label-memory field is documented as a label-value length statistic, not full heap attribution. Cardinality calculation and caching are implementation details that can vary by release; retain the article's advice to inspect the installed release.
- Stopping ingestion does not immediately remove persisted data or all head memory. WAL recovery explains why a restart is not a guaranteed cardinality reset.
- Reviewed against official documentation and upstream source. Shell syntax and jq field selection were checked locally with representative JSON. No live Prometheus target was provided, and PromQL and scrape behavior were reviewed statically rather than exercised against a running server.
