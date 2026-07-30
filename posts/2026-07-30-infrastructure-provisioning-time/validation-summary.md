# Validation Summary: How to Measure Infrastructure Provisioning Time from Request to Ready

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Platform engineering
- Infrastructure as Code (IaC), including Terraform and GitOps workflows
- Developer self-service platforms and provisioning orchestration
- OpenTelemetry tracing and spans
- Distributed trace-context propagation
- Latency distributions, percentiles, and right-censored time-to-event data
- Idempotent distributed workflows

## Sources Consulted

- [DORA: Flexible infrastructure](https://dora.dev/capabilities/flexible-infrastructure/)
- [Microsoft Learn: Design a developer self-service foundation](https://learn.microsoft.com/en-us/platform-engineering/developer-self-service)
- [Microsoft Learn: Self-service with guardrails](https://learn.microsoft.com/en-us/platform-engineering/about/self-service)
- [OpenTelemetry Specification: Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [W3C Trace Context Level 2](https://www.w3.org/TR/trace-context-2/)
- [AWS Well-Architected Framework: Make mutating operations idempotent](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html)
- [NIST/SEMATECH e-Handbook: Kaplan-Meier approach for censored data](https://www.itl.nist.gov/div898/handbook/apr/section2/apr215.htm)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)

## Issues Found

- The post described all listed workflow states as terminal even though `still running` is non-terminal. Changed the label to "outcome and lifecycle states."
- The idempotency statement implied that a key alone prevents duplicate resources. Clarified that the key must be consistently reused and enforced by every side-effecting component.
- The active-processing formula could double-count parallel spans. Defined active processing as the wall-clock duration covered by execution intervals and clarified that overlapping intervals must be merged or analyzed through an explicit critical path.
- The example metric contract called `censored` an outcome. Distinguished workflow outcomes from the observation status and described still-running requests as right-censored.
- Multiplying an affected-journey count by a median delay does not calculate total waiting time. Relabeled the result as an estimated time-weighted burden.

## Review Notes

The formulas and contracts are conceptual measurement definitions rather than executable code. No CLI commands, configuration files, or version-specific APIs are present. The external documentation links are valid, and the post's guidance on consumer-visible readiness, percentile reporting, cohort segmentation, guardrails, and treatment of open requests is consistent with the consulted sources.
