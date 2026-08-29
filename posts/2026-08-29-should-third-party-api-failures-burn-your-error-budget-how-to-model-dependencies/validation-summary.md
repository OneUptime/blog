# Validation Summary: Should Third-Party API Failures Burn Your Error Budget? How to Model Dependencies

## Status

validated

## Post Type

Technical guide / SRE reference

## Technologies Covered

- Site Reliability Engineering (SRE)
- Service level indicators (SLIs), service level objectives (SLOs), and error budgets
- Third-party API and dependency modeling
- Serial and redundant availability calculations
- Circuit breakers, fallbacks, graceful degradation, caching, and asynchronous retries
- Service level agreements (SLAs) and failure attribution

## Sources Consulted

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [Google Cloud: Defining SLOs for services with dependencies](https://cloud.google.com/blog/products/devops-sre/defining-slos-for-services-with-dependencies-cre-life-lessons)
- [Google Cloud: Understanding error budget overspend](https://cloud.google.com/blog/products/gcp/understanding-error-budget-overspend-cre-life-lessons)
- [AWS Well-Architected Reliability Pillar: Availability](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html)
- [AWS: Availability with dependencies](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-with-dependencies.html)
- [AWS: Availability with redundancy](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-with-redundancy.html)
- [AWS Well-Architected: Implement graceful degradation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_graceful_degradation.html)
- [AWS Well-Architected: Rely on the data plane during recovery](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_withstand_component_failures_avoid_control_plane.html)

## Issues Found

- The post sometimes assigned individual good/bad event classification to an SLO. An SLI measures and classifies events, while an SLO sets the target and determines the error budget. The affected wording and heading were corrected to distinguish SLI measurement from SLO budget consumption.
- The provider-throttling example classified throttling itself as a bad event. A dependency can throttle an attempt without making the logical user journey bad when a retry or fallback succeeds within the promised deadline. The example now classifies the event as bad only when an eligible, supported journey consequently fails or misses its deadline.

## Review Notes

The serial-dependency and redundant-component availability formulas are correct under the stated independence assumptions. The redundant calculation also assumes that either branch can satisfy the outcome and that failover detection, routing, and capacity work; the post appropriately labels the result theoretical and advises testing failover. All post links resolved to their intended resources. The post has no executable code, commands, configuration, deprecated APIs, or version-specific instructions, but its concrete SLI definitions, availability formulas, dependency classifications, and eligibility rules make it a technical guide suitable for full validation.
