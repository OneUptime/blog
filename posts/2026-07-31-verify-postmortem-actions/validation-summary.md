# Validation Summary: How to Verify That Postmortem Actions Actually Prevented a Repeat Incident

## Status
validated

## Post Type
Technical guide / SRE operational practice

## Technologies Covered
- Incident management and postmortem action tracking
- Site Reliability Engineering (SRE)
- Reliability testing and failure injection
- Chaos engineering and game days
- Unit, property, integration, and regression testing
- Prometheus alerting rules and rule tests
- Prometheus Alertmanager
- Canary, rollback, failover, backup, and restore validation

## Sources Consulted
- Google SRE Workbook, "Postmortem Culture: Learning from Failure": https://sre.google/workbook/postmortem-culture/
- Google SRE Book, "Postmortem Culture: Learning from Failure": https://sre.google/sre-book/postmortem-culture/
- Microsoft Azure Well-Architected Framework, "Develop an Incident Management Practice to Recover from Disruptions": https://learn.microsoft.com/en-us/azure/well-architected/design-guides/incident-management
- Microsoft Power Platform Well-Architected, "Recommendations for Designing an Emergency Response Strategy": https://learn.microsoft.com/en-us/power-platform/well-architected/operational-excellence/emergency-response
- Microsoft Azure Chaos Studio overview: https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-overview
- Microsoft Azure Chaos Studio, "Chaos Experiments": https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-chaos-experiments
- Prometheus, "Unit Testing for Rules": https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus, "Alerting Rules": https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus, "Alertmanager": https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus, "Alertmanager Configuration": https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus, "Notification Template Reference": https://prometheus.io/docs/alerting/latest/notifications/

## Issues Found
- The alert verification checklist implied that every Prometheus alert enters the pending state. Prometheus uses the pending state only when the rule has an optional `for` clause, so the checklist now makes that condition explicit.
- The checklist said that labels aggregate at service and region boundaries. PromQL expressions perform aggregation, while labels identify the resulting series and support Alertmanager routing. Updated the wording to distinguish expression aggregation from preserving routing labels.
- The checklist implied that a Prometheus alert becomes inactive immediately after recovery. A configured `keep_firing_for` clause can deliberately keep it firing, so the expected deactivation now accounts for that duration.
- The evidence guidance overstated the effect of a moving dashboard window. Clarified that a link opening a relative time range does not itself preserve the incident view.
- The final checklist used `partial` instead of the defined `partially verified` outcome and omitted `superseded`. Updated it to use all five outcome names consistently.
- The emergency-response source was labeled as part of the Azure Well-Architected Framework even though the linked page belongs to Power Platform Well-Architected. Corrected the link label.

## Review Notes
The examples are intentionally pseudocode and checklists rather than executable programs, commands, or configuration files, so no local syntax or runtime testing was applicable. The core guidance on measurable postmortem actions, layered verification, controlled fault injection, durable evidence, bypass testing, and regression coverage is consistent with the consulted SRE, Microsoft, and Prometheus documentation. Alertmanager notification contents and resolved-notification behavior remain receiver- and template-specific.
