# Validation Summary: How to Replace Summary Quantiles with Service-Wide Prometheus Histograms

## Status
validated

## Post Type
Technical migration guide with Go instrumentation and PromQL examples.

## Technologies Covered
- Prometheus summaries and classic histograms
- PromQL aggregation, counter rates, and percentile calculations
- Go and the Prometheus `client_golang` instrumentation library
- Native histograms, monitoring, observability, and latency SLOs

## Sources Consulted
- Prometheus histogram and summary comparison: https://prometheus.io/docs/practices/histograms/#quantiles
- Prometheus Go client API, including `NewHistogramVec`, `HistogramOpts`, registry descriptors, and `SummaryOpts`: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- PromQL histogram quantile contract and edge cases: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- PromQL counter rate and aggregation guidance: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus metric naming, units, and label cardinality: https://prometheus.io/docs/practices/naming/#labels
- Prometheus histogram and summary exposition: https://prometheus.io/docs/instrumenting/exposition_formats/#histograms-and-summaries
- Prometheus native histogram specification and scrape configuration: https://prometheus.io/docs/specs/native_histograms/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The percentile explanation implied interpolation always occurs inside the containing bucket. Added the classic histogram overflow exception: when p99 falls in `+Inf`, the result is the highest finite boundary, which is 5 seconds here. This matters when interpreting a slow tail beyond the configured range.
- The SLO explanation described the `le="0.3"` bucket as requests below 300 milliseconds. Changed this to “at most 300 milliseconds” because the upper bound is inclusive. Made the calculation explicit as summed bucket rates divided by summed count rates over the same window with matching filters and grouping labels, so it measures the intended service population and period.

## Review Notes
- Verified the Go declaration against the documented, non-deprecated `NewHistogramVec` signature and `HistogramOpts` fields. The eleven finite boundaries are strictly increasing; the implicit infinity bucket yields twelve bucket series, plus sum and count, per instantiated label combination in classic exposition.
- The Go example is an integration fragment requiring the Prometheus package import, registry registration, and observation calls in the surrounding application. Registration is already called out in the post. No standalone program execution was performed.
- Reviewed the PromQL syntax and semantics against official examples. The query preserves `le`, applies counter rates before aggregation, and returns a percentile per cluster and service. No live Prometheus query or rollout was executed.
- The `cluster` grouping assumes that label exists on the queried series, typically through target labeling. The Go vector itself declares only service, route, and method. If cluster is absent, the query remains valid but does not separate clusters.
- Confirmed the core migration claims: summary quantiles cannot reconstruct a combined distribution; sums and counts can support an aggregate mean; consistent classic boundaries are necessary; and unequal instance traffic changes service percentile weighting. Historical quantiles alone cannot recover discarded observations.
- Comparing counts and sums on the same migrated population is appropriate. Summary quantile retention differs from cumulative sum/count behavior, and histogram interpolation differs from summary quantile estimation. Exact percentile equality is therefore not a suitable acceptance criterion.
- Separate metric names, bounded route labels, identical observations, a complete query window, and staged consumer migration are appropriate guidance. Sum rates assume nonnegative observations, as expected for request durations.
- Native histograms are a valid alternative, with configuration dependent on the deployed server and client. The post correctly avoids claiming universal support and requires checking the complete ingestion and query path.
- All external links in the post resolved to the intended resources, including the author profile redirect. No terminal commands, configuration snippets, or specific version claims appear in the post.
