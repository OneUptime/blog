# Validation Summary: How to Split or Merge Incidents That Share an Upstream Dependency

## Status
validated

## Post Type
Technical incident-response guide. The post contains product-specific implementation details about incident merging, alert movement, and inhibition configuration, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- PagerDuty incident merging, alert movement, responders, subscribers, and webhook behavior.
- Prometheus Alertmanager notification grouping, inhibition, silences, and `equal` label matching.
- SRE incident command, dependency investigation, customer-impact tracking, and recovery coordination.

## Sources Consulted
- [PagerDuty: Edit Incidents](https://support.pagerduty.com/main/docs/edit-incidents) — merge requirements, source resolution, responder and subscriber behavior, and integration implications.
- [PagerDuty: Move Alerts to Another Incident](https://support.pagerduty.com/main/docs/edit-incidents#move-alerts-to-another-incident) — moving alerts into new or existing incidents.
- [Prometheus: Alertmanager overview](https://prometheus.io/docs/alerting/latest/alertmanager/) — grouping, inhibition, and time-limited silences.
- [Prometheus: Inhibition configuration](https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule) — source/target matching, `equal`, and missing or empty label semantics.
- [Google SRE: Managing Incidents](https://sre.google/sre-book/managing-incidents/) — incident command, delegated responsibilities, coordinated operational changes, retained incident documentation, and explicit handoffs.
- [Author GitHub profile](https://github.com/nawazdhandala) — checked the author link destination.

## Issues Found
No technical issues found.

## Review Notes
- PagerDuty documentation confirms that the target must be open, alerts move to that target, and source incidents resolve with a merged reason. Source responders and subscribers do not transfer automatically. Moving alerts to either new or existing incidents is documented.
- PagerDuty documents merge-related resolution webhooks and changes to which service receives subsequent webhook updates. The recommendation to test integrations before relying on merge automation is appropriate; no actual customer integration was available for runtime verification.
- Alertmanager groups alerts into notifications and suppresses notifications through inhibition or silences. These mechanisms do not independently establish causality or determine incident command structure.
- Inhibition requires matching values for labels listed in `equal`; missing and empty values are equivalent. The warning about overly broad matches is accurate. Source and target matchers still govern whether a rule applies.
- The three response structures are explicitly presented as proposed operating practice, not a vendor feature or universal standard. Clear owners, coordinated changes, and retained evidence align with Google's incident-management guidance.
- The incident IDs, timing, dependency failure, poisoned message, and recovery criteria are illustrative. The fenced `text` block is an incident-note example, not executable code or a vendor configuration format. No CLI, syntax, or runtime tests were applicable.
- The post specifies no software versions and uses no deprecated configuration fields or APIs. Documentation links lead to the relevant resources. Product behavior was checked against the currently available official documentation.
- README.md was left unchanged. Validation metadata uses the requested date, 2026-09-29.
