# Validation Summary: How to Write Outcome-Based SLOs for Batch Jobs, Queues, and Async Pipelines

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level objectives (SLOs) and service level indicators (SLIs)
- Batch processing, message queues, asynchronous workflows, and data pipelines
- Promise-based outcome accounting, retries, dead-letter queues, and watermarks
- Prometheus counters, labels, and histograms
- HTTP `202 Accepted` semantics

## Sources Consulted

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Data Processing Pipelines](https://sre.google/workbook/data-processing/)
- [Google Cloud Observability: SLI overview](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Prometheus: Instrumentation](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus: Metric types](https://prometheus.io/docs/concepts/metric_types/)
- [Prometheus: Data model](https://prometheus.io/docs/concepts/data_model/)
- [RFC 9110, Section 15.3.3: 202 Accepted](https://www.rfc-editor.org/rfc/rfc9110.html#status.202)

## Issues Found

- The notification SLO required only a terminal state, so a fast terminal failure would have satisfied it. Changed the objective to require a successful terminal state.
- The evaluator described `good`, `late`, `failed`, `missing`, and `excluded` as mutually exclusive results for eligible promises. This was inconsistent because excluded promises are ineligible, and a promise missing at its deadline can later complete late. Changed the design to exclude promises before denominator accounting, assign one immutable `good` or `bad` result at the deadline, and retain `late`, `failed`, and `missing` as diagnostic reasons that do not rewrite the SLO result.
- The Prometheus guidance called counters "bounded," although counters are monotonic and the label-value set is what should be bounded. It also used `sli_result="good|bad"`, which denotes one literal Prometheus label value rather than two alternatives. Changed the text to describe monotonic counters with bounded label values and showed separate `good` and `bad` series, with exactly one increment per eligible promise.
- The combined evaluator and conclusion omitted durability from their success criteria even though the post identifies durability as a promised outcome dimension. Added durability where the product contract promises it.

## Review Notes

All referenced URLs resolve to the intended authoritative resources; the author URL redirects to the canonical GitHub profile. The fenced `text` blocks are schema and ratio pseudocode rather than executable code, and the post contains no CLI commands, version-specific APIs, or configuration that require runtime validation. The "exactly once" example describes observable destination-output uniqueness, not a claim of exactly-once processing semantics.
