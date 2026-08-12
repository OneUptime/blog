# Validation Summary: Leading vs Lagging Improvement Metrics: How to Know Before the Quarter Ends

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- DORA software delivery performance metrics and capability evidence
- Kanban flow metrics and service level expectations
- Google SRE monitoring and the four golden signals
- Statistical process control and NIST control-chart guidance
- YAML decision-rule examples

## Sources Consulted

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA capability catalog](https://dora.dev/capabilities/)
- [DORA: Work in process limits](https://dora.dev/capabilities/wip-limits/)
- [DORA: Working in small batches](https://dora.dev/capabilities/working-in-small-batches/)
- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)
- [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [NIST: What Are Control Charts?](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST: Shewhart X-bar and R and S Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc321.htm)
- [NIST: Variables Control Charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc32.htm)
- [NIST: Autocorrelation](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found

- The scorecard guidance said that five to eight measures were enough, but the five listed categories total six to nine measures: 1–2 adoption signals, 1–2 flow diagnostics, 2 delivery or process outcomes, 1 customer or service outcome, and 1–2 guardrails. Changed “five to eight” to “six to nine” so the stated range matches the breakdown.

## Review Notes

- The current DORA documentation confirms the five metric names used in the post and their role as leading indicators for organizational performance and employee well-being and lagging indicators for software development and delivery practices.
- The Kanban flow-metric definitions and the recommendation to use a service level expectation as a reference for actively managing aging work are accurate.
- Google SRE supports the four golden signals and monitoring impending saturation; its overload guidance supports the claim that queue growth can precede increased latency.
- NIST supports the discussion of in-control behavior, investigation signals, detection-speed versus false-alarm tradeoffs, and the need to consider randomness and distribution assumptions.
- Both YAML examples are syntactically valid mappings. Their thresholds are illustrative decision rules rather than universal operational defaults.
