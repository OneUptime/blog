# Validation Summary: Define SLIs and SLOs from User Journeys Before Launch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Service Level Indicators (SLIs)
- Service Level Objectives (SLOs)
- Site Reliability Engineering (SRE)
- Error budgets and multiwindow, multi-burn-rate alerting
- Observability and synthetic monitoring
- YAML-based SLO specifications

## Sources Consulted
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: A Collection of Best Practices for Production Services](https://sre.google/sre-book/service-best-practices/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)

## Issues Found
- The latency-attainment numerator did not explicitly require a good outcome, so a fast failed request could be interpreted as satisfying the latency SLI. Changed the numerator to count good eligible events completed within the threshold.
- The `PlaceOrder` example made an operation eligible only after acceptance while also classifying server rejection as a bad eligible event. That denominator could omit otherwise valid user attempts rejected by the service. Changed the event and YAML eligibility boundary to attempts received at the public edge, started latency at that boundary, and narrowed the authentication exclusion to invalid or expired credentials.

## Review Notes
The error-budget calculations are correct. The example configuration parses as valid YAML but intentionally represents an organization-specific specification rather than a standard tool schema. All five official documentation links resolve to the intended Google SRE chapters, and the post makes no version-specific software claims.
