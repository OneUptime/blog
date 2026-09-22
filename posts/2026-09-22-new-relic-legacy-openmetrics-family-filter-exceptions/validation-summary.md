# Validation Summary: How to Exclude OpenMetrics Metric Families in the Legacy New Relic Integration While Keeping Selected Exceptions

## Status
validated

## Post Type
Technical configuration guide.

## Technologies Covered
- New Relic legacy Prometheus OpenMetrics integration (`nri-prometheus`).
- Prometheus metric families, classic histograms, and summaries.
- YAML integration configuration and Helm ConfigMaps.
- New Relic Kubernetes Prometheus agent and metric relabeling.

## Sources Consulted
- [New Relic: Ignore or include Prometheus metrics](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-openmetrics/ignore-or-include-prometheus-metrics/) — configuration fields, prefix exceptions, family filtering, and transformation ordering.
- [New Relic integration rule implementation](https://github.com/newrelic/nri-prometheus/blob/main/internal/integration/rules.go) — `RuleProcessor`, `shouldIgnore`, and `isMetricExcepted`; confirms aggregation of ignore rules and global exception precedence.
- [New Relic integration rule tests](https://github.com/newrelic/nri-prometheus/blob/main/internal/integration/rules_test.go) — prefix filtering, exception-only selection, and exceptions taking priority over other rules.
- [New Relic legacy integration repository](https://github.com/newrelic/nri-prometheus) — deployment context and replacement of the Kubernetes integration by the Prometheus agent.
- [Prometheus: Histograms and summaries](https://prometheus.io/docs/practices/histograms/) — observation counts, sums, and classic histogram buckets.
- [Prometheus: Exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/) — histogram type metadata, sample naming, bucket ordering, and the relationship between the infinite bucket and count.
- [New Relic: Set up the Prometheus agent, metric and label transformations](https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/setup-prometheus-agent/#metric-label-transformations) — metric filtering through relabel configuration and collector-specific syntax.

## Issues Found
1. **Incorrect implication that separate rules cannot override a drop.** The original paragraph warned that a later independent exception could not restore discarded data and implied overlapping drops could defeat the selected exceptions. The implementation aggregates ignore rules across all transformations and checks every exception before evaluating drops. Replaced that paragraph with the actual global exception precedence and a warning about other exceptions retaining additional families. The upstream test `TestIgnoreRules_MatchingExceptRulesTakesPriorityOverOtherRules` also covers this behavior.
2. **Missing histogram type metadata in the exposition example.** Added `# TYPE catalog_request_duration_seconds histogram` before the samples. Without a type declaration, a standalone Prometheus text exposition treats the samples as untyped instead of identifying the intended histogram family. The sample values and names remain unchanged.

## Review Notes
- Both YAML examples parse successfully and use the documented legacy configuration structure. The keep/drop table is correct for each example used independently. Exception strings match prefixes, including longer neighboring family names.
- Confirmed that filtering precedes attribute addition, copying, and renaming. Histogram and summary filtering uses the base family rather than independently selecting component series.
- The histogram example has increasing bucket bounds, cumulative counts, and an infinite bucket count equal to the total count.
- All four technical links in the post resolve to the intended official resources; the migration link's `metric-label-transformations` anchor exists.
- The article deliberately covers the legacy collector. New Relic identifies the Prometheus agent as its Kubernetes replacement; the post correctly distinguishes their configuration syntaxes. No specific installed collector version is claimed, so deployment-specific verification remains necessary.
- The canary, recent-query-window, rollback, and duplicate-scraper guidance is consistent with collection-time filtering. Changing collector configuration does not delete previously ingested points.
- Validation consisted of official documentation and implementation review plus local YAML parsing. No live New Relic account, Kubernetes deployment, or ingestion test was used. There are no terminal commands in the post to execute.
