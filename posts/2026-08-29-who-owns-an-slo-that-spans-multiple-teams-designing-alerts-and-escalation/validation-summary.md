# Validation Summary: Who Owns an SLO That Spans Multiple Teams? Designing Alerts and Escalation

## Status

validated

## Post Type

Technical operations guide

## Technologies Covered

- Service level objectives (SLOs), service level indicators (SLIs), and error budgets
- Multiwindow, multi-burn-rate alerting
- On-call routing and escalation policies
- Incident response and incident command
- OpenSLO metadata and alert policies
- CI validation of ownership and on-call references

## Sources Consulted

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Documenting the SLO and Error Budget Policy](https://sre.google/workbook/implementing-slos/#documenting-the-slo-and-error-budget-policy)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [Prometheus: Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [OpenSLO specification](https://github.com/OpenSLO/OpenSLO)
- [PagerDuty: Escalation Policies](https://support.pagerduty.com/main/docs/escalation-policies)

## Issues Found

No technical issues found.

## Review Notes

The post contains no executable code, terminal commands, or version-specific configuration, but it does contain substantive technical implementation guidance for SLO ownership, alert routing, no-data handling, error-budget enforcement, and incident escalation. Google SRE guidance supports the user-journey/component ownership split, stakeholder-approved error-budget policies, fast-burn paging, slow-burn ticketing, and named incident-command roles. The exact five- and 15-minute escalation intervals are appropriately presented as examples rather than universal requirements. OpenSLO supports generic labels and alert policies, including explicit no-data behavior, but does not standardize the ownership and organizational escalation fields recommended by the post; those recommendations are correctly presented as local policy.
