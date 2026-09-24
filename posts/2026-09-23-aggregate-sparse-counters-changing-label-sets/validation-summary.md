# Validation Summary: How to Aggregate Sparse Counters with Changing Label Sets

## Status
validated

## Post Type
Technical guide with PromQL queries and a Python instrumentation example.

## Technologies Covered
- Prometheus counter metrics, scraping, time-series identity, and staleness
- PromQL range functions, aggregation, comparisons, and presence queries
- Python and the prometheus_client library
- Optional creation/start timestamp ingestion and query features

## Sources Consulted
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query basics, range selectors, and staleness: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators, comparison filtering, and aggregation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus feature flags for creation/start timestamps: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Prometheus instrumentation guidance: https://prometheus.io/docs/practices/instrumentation/
- Python client labeled metric initialization: https://prometheus.github.io/client_python/instrumenting/labels/
- Python client counter API and naming: https://prometheus.github.io/client_python/instrumenting/counter/
- Official Prometheus range-function implementation: https://github.com/prometheus/prometheus/blob/main/promql/functions.go
- Official Prometheus query engine and stale-sample handling: https://github.com/prometheus/prometheus/blob/main/promql/engine.go
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all four PromQL examples against the documented function signatures and operator syntax. Computing rate or increase before aggregation preserves individual reset handling. The default counter calculation needs two samples; the article correctly identifies supported timestamp features as a possible exception.
- Confirmed that range selection can retain earlier observations after a series disappears from instant selection. The query engine skips stale markers when collecting range samples. A departing worker contributes only while sufficient usable observations remain.
- The coverage comparison filters to observed series with fewer than two samples; it cannot enumerate entirely unseen workers. The presence query counts distinct worker label values within each queue, assuming those values identify workers within that scope. Reused worker names across instances would require additional identity labels for a physical-worker count.
- Confirmed that increase extrapolates and can return fractional totals. Counter decreases support reset detection, but an unobserved reset followed by sufficient growth can escape value-based detection.
- Parsed and executed the exact Python example locally. Collection returned jobs_processed_total values of zero for both emails and invoices. The example initializes metrics; an application must separately expose its registry for scraping, and a scrape must occur before activity to observe the zero baseline.
- Creation/start timestamp support remains feature- and deployment-dependent. The post appropriately avoids promising automatic recovery of initial events or specifying flags that every deployment must support.
- The warning about or vector(0) is appropriate: an unlabeled fallback cannot establish worker coverage or distinguish missing observations from inactivity.
- All external links in the post resolved to the intended documentation or author profile. No terminal commands, configuration snippets, or pinned software-version claims required validation, and no deprecated API usage was found.
- PromQL verification used official documentation and implementation inspection; no live Prometheus fixture suite was executed because promtool was not available locally. The suggested missing-data fixtures are recommendations, not tests supplied by the post.
- README.md required no changes. Review completed on 2026-09-24.
