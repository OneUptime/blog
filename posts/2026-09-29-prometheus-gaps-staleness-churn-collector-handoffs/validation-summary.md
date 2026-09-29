# Validation Summary: How to Trace Prometheus Gaps from Staleness, Churn, and Collector Handoffs

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Prometheus and PromQL
- Scrape health, metric relabeling, staleness, and time-series identity
- Recording rules and alerting rules
- OpenTelemetry Collector Prometheus receiver
- Cumulative-to-delta conversion and OTLP metric delivery

## Sources Consulted
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) — selectors, query steps, lookback, and staleness.
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — counter rates, reset handling, aggregation order, and sample counts.
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — comparison precedence, `unless`, label matching, and aggregation.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — target labels, `up`, and scrape sample metrics.
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/) — metric and label identity.
- [Prometheus configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — label conflicts, metric relabeling, and timestamp staleness settings.
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — skipped evaluations and resulting recording gaps.
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) — alert instances and pending duration.
- [OpenTelemetry metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) — stream identity, single-writer requirements, temporality, and start timestamps.
- [Collector Prometheus receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md) — duplicate scraping across replicas and manual sharding.
- [Collector cumulative-to-delta processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md) — retained state and first-point handling after restart.
- [Scaling the Collector](https://opentelemetry.io/docs/collector/scaling/) — target allocation and stateful scaling considerations.
- [OTLP specification](https://opentelemetry.io/docs/specs/otlp/) — partial success and delivery acknowledgements.
- [Author profile](https://github.com/nawazdhandala) — verified the post's author link redirects to the expected profile.

## Issues Found
1. **Graph resolution was insufficient to verify individual stored observations.** A small query step still evaluates instant selectors using lookback and can repeat an earlier sample. Added an instant-query range-vector example for inspecting actual sample timestamps, preserving the existing advice about graph resolution.
2. **The missing-family query's interpretation omitted label and ingestion assumptions.** `unless on (job, instance)` only tests query-time presence under those labels. Clarified that labels must match and uniquely identify targets, and that relabeling can remove an exposed family. The query itself is valid and remains unchanged.
3. **The rolling sample-count explanation suggested an abrupt transition.** After collection stops, samples ordinarily age out of the five-minute window gradually. Corrected the explanation and stated that an empty window removes the series from the result rather than producing zero.

## Review Notes
- Reviewed all five original PromQL blocks against official syntax and semantics; none uses deprecated functions or operators. Also checked the added inline range-vector expression. Validation was documentation-based; no live Prometheus or Collector deployment was supplied or exercised.
- The distinction between successful scraping and downstream ingestion is sound. Scrape success does not guarantee expected metric presence, and transport responses must be interpreted with backend and partial-success evidence.
- Rate-before-sum ordering, label changes creating new series, skipped recording-rule evaluations, and changing alert identities affecting pending periods are correct.
- The service aggregation assumes `service` and `region` are populated as metric labels. Resource attributes require appropriate mapping before they can be used as PromQL labels.
- Explicit sample timestamps require checking `honor_timestamps` and `track_timestamps_staleness`; the post correctly distinguishes these from normal scrape staleness. Query-time presence alone does not prove the latest scrape exposed the metric.
- Collector handoff and cumulative-to-delta state concerns are valid. First-point handling depends on processor configuration; overlapping writers need not produce identical rejection behavior in every backend.
- Both technical links and the author link resolve to the expected resources. No terminal commands, configuration snippets, or pinned software versions appear in the post.
- Kept the title, section structure, tone, and original PromQL blocks intact. Only diagnostic correctness changes were made.
