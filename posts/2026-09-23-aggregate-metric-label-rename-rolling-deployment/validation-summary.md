# Validation Summary: Aggregate Metric Label Renames in Rolling Deployments Without Double Counting

## Status
validated

## Post Type
Technical guide with PromQL examples.

## Technologies Covered
- Prometheus counters, labels, time series identity, and scrape health metrics.
- PromQL rate calculations, label replacement, aggregation, and set union.
- Metric schema migration during rolling deployments.

## Sources Consulted
- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- Prometheus querying basics, including empty-label matching and range queries: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions, including `rate()` and `label_replace()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators, including aggregation and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus jobs and instances, including `job`, `instance`, and `up`: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus implementation of rate calculations and sample requirements: https://github.com/prometheus/prometheus/blob/main/promql/functions.go
- Author link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all three PromQL examples against the official function signatures, selector syntax, aggregation syntax, and set-operator semantics. No terminal commands, configuration snippets, or version-specific installation instructions appear in the post.
- Changing label keys creates distinct series. The query correctly requires equivalent label values and an explicit producer identity before treating the two forms as duplicates.
- The selectors separate the branches: a nonempty `route` enters the new branch; a nonempty `handler` with absent or empty `route` enters the old branch. A single series carrying both nonempty labels enters only the new branch.
- `label_replace()` copies the captured handler value while preserving the source label; the subsequent grouping removes that source label and other dimensions outside the declared identity.
- Each original counter is passed through `rate()` before aggregation, preserving per-series reset detection. The post correctly acknowledges extrapolation and incomplete series lifetimes during the handoff.
- Both branches yield the same grouping labels. The explicit `or on (...)` retains matching new results and falls back only for missing identities; the final aggregation then combines producers. Independent producers remain distinct until that selection is complete.
- The four rollout cases are consistent with these semantics. This is a documentation and source review; no live Prometheus rollout or executable query test was performed.
- Fallback depends on result presence, not exporter health or whether a value is zero. Monitoring `up` and series presence separately is appropriate. Duplicate collection paths and independent populations require the separate treatment already described in the post.
- Historical range queries evaluate earlier timestamps, so retaining the old branch for supported historical windows is appropriate. The expression is not an exact request-accounting mechanism across a schema switch.
- The APIs used are documented without deprecation or experimental-feature requirements. Sample availability can depend on ingestion and start-timestamp support; the post appropriately avoids promising a fixed number of scrapes before handoff.
- Both Prometheus documentation links resolve to the intended resources, and the author URL redirects to the matching GitHub profile. README.md required no changes.
