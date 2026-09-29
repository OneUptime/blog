# Validation Summary: How to Turn Customer Outage Reports into SLIs and Alerts for Earlier Detection

## Status
validated

## Post Type
Technical guide with a Prometheus alerting-rule configuration and custom metric examples.

## Technologies Covered
- Prometheus counters, PromQL, and alerting rules
- Alertmanager routing and notification timing
- promtool rule unit testing
- Service-level indicators (SLIs), service-level objectives (SLOs), and burn-rate alerting
- Asynchronous export processing, HTTP 202, outcome classification, and synthetic monitoring

## Sources Consulted
- Google SRE Workbook, Implementing SLOs: https://sre.google/workbook/implementing-slos/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus rule unit testing: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus instrumentation practices: https://prometheus.io/docs/practices/instrumentation/
- Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- RFC 9110, HTTP 202 Accepted: https://www.rfc-editor.org/rfc/rfc9110.html#name-202-accepted
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- The volume-guard description implied an exact count of at least 100 classified outcomes in five minutes. Prometheus extrapolates increase() to the selected window boundaries and can return fractional counts. Updated the introductory sentence to identify the count as an estimate and explain the extrapolation. The rule itself remains correct for an estimated-volume guard.

## Review Notes
- Reviewed the YAML rule structure, selectors, regional aggregation, comparison operators, matching with and on (region), labels, and annotation template against official documentation. The comparisons filter series, so regions must satisfy both the failure-ratio threshold and the volume guard.
- Applying rate before aggregation preserves per-series reset handling. The two-minute for duration requires the condition to remain active at successive evaluations before firing.
- The metric is explicitly application-defined. Correct classification, deduplication, deadline handling, and reconciliation must be implemented by the service; Prometheus cannot recover missing or duplicated classifications.
- The SLI specification and implementation distinction, user-outcome focus, and guidance on burn-rate alerts are consistent with Google SRE guidance. The 60-second deadline and alert thresholds are illustrative product decisions, not prescribed defaults.
- HTTP 202 indicates acceptance, not successful completion. The post correctly retains a separate signal for failures before export acceptance.
- Missing observations and low traffic require independent checks. A synthetic journey must have its own detection path when test traffic is excluded from the production SLI.
- A brief failure spike can remain in the five-minute window long enough to satisfy for: 2m; replay fixtures should establish its actual behavior rather than assume every short spike is suppressed.
- promtool test rules is the documented command family and requires a test fixture filename when invoked. No executable test fixture is supplied in the post. This review checked syntax and behavior against documentation; promtool was not available locally and no rule execution or live notification-delivery exercise was performed.
- A severity: page label requires matching Alertmanager routing to deliver a page. The post correctly calls for verifying the full notification path, including grouping delay and recovery behavior. Dashboard and runbook destinations remain deployment-specific.
- All external links in the post resolve to the intended resources; the author link redirects to the canonical GitHub profile. No version-specific or deprecated API usage was found.
