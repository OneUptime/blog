# Validation Summary: How to Handle Counter Resets and Label Churn for Reliable Rates and Alerts

## Status

validated

## Post Type

Technical guide with PromQL examples.

## Technologies Covered

- Prometheus counters, time-series identity, and recording rules
- PromQL rate, reset detection, aggregation, and comparisons
- Prometheus alerting rules and pending state
- OpenTelemetry metrics, resource attributes, temporality, and Collector pipelines
- Native histograms

## Sources Consulted

- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — rate, irate, resets, absence detection, and histogram behavior.
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — aggregation syntax, label grouping, and comparison filtering.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) — selectors, range windows, and staleness.
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/) — metric and label identity.
- [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/) — counter and gauge semantics.
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) — alert instances, for duration, labels, annotations, and keep_firing_for.
- [Using Prometheus as your OpenTelemetry backend](https://prometheus.io/docs/guides/opentelemetry/) — resource-attribute promotion and target_info mapping.
- [OpenTelemetry metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) — stream identity, single-writer requirements, start timestamps, temporality, resets, and gaps.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the linked author destination.

## Issues Found

- The label-churn explanation implied that any resource-attribute change necessarily creates a new Prometheus counter series. Resource metadata may instead appear on target_info or may not be promoted onto the counter. Updated the paragraph to require a change to the counter's destination labels. This preserves the distinction between OpenTelemetry stream identity and Prometheus series identity without changing the post's structure or examples.

## Review Notes

- Reviewed all four PromQL examples against official function and operator documentation. Their selectors, range durations, aggregation clauses, and comparisons are valid and use current features. These were documentation checks, not live Prometheus execution.
- Confirmed the ordering of per-series rate calculation followed by aggregation. The numerical example correctly shows an aggregate rising from 200 to 305 despite one instance resetting; aggregation loses the evidence needed to correct that reset.
- Confirmed that label changes create independent series and that sharing a complete counter identity across writers can corrupt reset interpretation. Sharing instance alone is insufficient to collide if other labels distinguish the series.
- The example metric and labels must exist in the reader's environment. The error threshold represents more than one error per second, rather than an error percentage. The examples assume ordinary float counters.
- Pending-period discussion assumes an alert rule with a for duration. Rule labels also participate in alert identity; changing diagnostic values belong in annotations. Stable labels cannot compensate for missing evidence. keep_firing_for can bridge temporary firing gaps but does not replace telemetry coverage monitoring.
- Window and scrape-cadence guidance is consistent with range-based rate estimation. Reset detection depends on observed samples and does not establish an exact count of process restarts or recover unobserved work.
- Confirmed the native-histogram caveat: reset detection considers histogram structure, and a rate range mixing floats and native histograms is omitted with a warning. Fixtures should match the actual data type.
- OpenTelemetry start timestamps and temporality support interpreting lifecycle boundaries; its detailed Resets and Gaps section is currently marked Development.
- The post contains no terminal commands, configuration snippets, or explicit version claims. Its external links resolve to the intended resources. No deprecated features were identified in its examples.
