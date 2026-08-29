# Validation Summary: Should Planned Maintenance Count Against an SLO? A Decision Framework

## Status

validated

## Post Type

Technical guide and decision framework

## Technologies Covered

- Service level indicators (SLIs) and service level objectives (SLOs)
- Error budgets and time-based versus request-based availability measurement
- Service level agreements (SLAs) and maintenance exclusions
- Amazon CloudWatch Application Signals SLO time window exclusions
- Grafana Cloud SLO maintenance windows
- Graceful degradation, redundancy, queues, and supported-hours policies

## Sources Consulted

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Book: Embracing Risk](https://sre.google/sre-book/embracing-risk/)
- [Google SRE Book: Availability Table](https://sre.google/sre-book/availability-table/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: SLO Engineering Case Studies](https://sre.google/workbook/slo-engineering-case-studies/)
- [Google Cloud: How maintenance windows affect your error budget](https://cloud.google.com/blog/products/management-tools/sre-error-budgets-and-maintenance-windows)
- [AWS Well-Architected Reliability Pillar: Availability](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html)
- [Amazon CloudWatch: Service level objectives](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html)
- [Amazon Application Signals API: ExclusionWindow](https://docs.aws.amazon.com/applicationsignals/latest/APIReference/API_ExclusionWindow.html)
- [Grafana Cloud: Maintenance windows for Grafana SLO](https://grafana.com/docs/grafana-cloud/observe-and-act/alert-and-measure-reliability/slo/maintenance-windows/)

## Issues Found

- The post originally said an exclusion must be "reflected in the denominator." That was too implementation-specific: CloudWatch excludes good and bad requests for request-based SLOs, but treats data in an excluded period as non-breaching for period-based SLOs. The wording now requires the exclusion to be explicit in the SLI eligibility rules and compliance calculation.
- The post originally said broadly that missing telemetry is unknown. Grafana SLO maintenance windows intentionally omit generated SLI recording-rule samples while continuing to collect source metrics, so the wording could conflate a known derived-metric gap with missing raw observations. The post now says to preserve source telemetry and treats unexplained missing source telemetry as unknown rather than as evidence of maintenance.

## Review Notes

- The central recommendation is supported by AWS's strict availability definition, which includes scheduled and unscheduled interruptions and advises against excluding planned maintenance for an always-on service.
- Google SRE's Evernote case study explicitly treated published maintenance windows as downtime because not all users could be assumed to know about them. The Chubby example also accurately describes intentionally planned outages used to prevent reliance on availability above the stated objective.
- The error-budget arithmetic is correct: a 99.9% objective over 30 days permits 43.2 minutes of unavailability, and a 30-minute outage consumes approximately 69.44% of that allowance.
- The distinction between time-based and request-based forecasting is correct. A request-based SLO should charge the affected eligible requests rather than translate elapsed downtime directly into failures.
- Grafana SLO maintenance windows are currently a public-preview Grafana Cloud feature. They pause error-budget consumption and burn-rate alerts by omitting generated SLI samples, do not backfill those samples, and continue collecting source metrics.
- In an operational policy, "business days" should be backed by an explicit holiday calendar as well as the `Europe/London` time zone. This does not affect the correctness of the illustrative example.
- All referenced documentation links and the author profile link resolved to their intended destinations during review.
