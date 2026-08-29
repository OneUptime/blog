# Validation Summary: How to Calculate a User-Journey SLO Across Sequential and Redundant Dependencies

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level indicators (SLIs), service level objectives (SLOs), and error budgets
- Availability and probability modeling for sequential dependencies
- Redundant dependency and failover modeling
- Critical user-journey measurement
- Prometheus counters and PromQL
- Reliability testing and failure correlation

## Sources Consulted

- [AWS Well-Architected Reliability Pillar: Availability](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html)
- [AWS: Availability with dependencies](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-with-dependencies.html)
- [AWS: Availability with redundancy](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-with-redundancy.html)
- [AWS Well-Architected: Rely on the data plane and not the control plane during recovery](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_withstand_component_failures_avoid_control_plane.html)
- [Microsoft Azure: How to read a service-level agreement](https://learn.microsoft.com/en-us/azure/reliability/concept-service-level-agreements)
- [Microsoft Azure: Redundancy, replication, and backup](https://learn.microsoft.com/en-us/azure/reliability/concept-redundancy-replication-backup)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Prometheus: Query functions (`rate`)](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus: Aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [Prometheus: Instrumentation best practices](https://prometheus.io/docs/practices/instrumentation/)

## Issues Found

- The post described the measurement itself as an SLO. An SLO is a target applied to an SLI, so the text now identifies the logical-outcome ratio as the SLI underlying the user-journey SLO.
- The original prose said the PromQL denominator came from durable journey starts, but the query actually counts terminal outcomes. The post now requires every eligible start to be persisted and reconciled into exactly one terminal outcome, including a bad outcome when the deadline passes without completion. It also identifies the example as a rolling five-minute SLI query.
- The original active/active warning incorrectly implied that paths sharing a control plane could not be redundant. The text now states the precise limitation: such paths must not be treated as independent redundancy when they share a hard control-plane dependency.
- The conclusion said boundary measurement automatically included all relevant behavior. It now conditions that claim on every eligible journey start eventually being classified, matching the instrumentation invariant established earlier.

## Review Notes

- Both numerical examples were independently recalculated and are correct: three independent 99.9% sequential dependencies produce 99.7003%, and two independent 99.9% redundant alternatives produce 99.9999%.
- The PromQL is syntactically and semantically valid when `journey_outcomes_total` is a counter. Applying `rate()` before `sum()` correctly preserves counter-reset handling, and summing before division produces an event-weighted aggregate ratio.
- The `[5m]` range is a rolling operational view. Compliance must be evaluated over the reporting window defined by the SLO.
- At zero traffic the ratio is undefined, and implementations should initialize expected result-label series if a zero-valued numerator must remain present.
- All four references in the post resolved to the intended official documentation. No version-specific or deprecated APIs are involved.
