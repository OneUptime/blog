# Validation Summary: How to Implement SRE Error Budgets for Service Reliability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site Reliability Engineering (SRE)
- Service Level Indicators (SLIs)
- Service Level Objectives (SLOs)
- Error budgets and burn rates
- Python
- YAML
- Prometheus alerting rules and PromQL
- OneUptime SLO and error budget management

## Sources Consulted
- Google SRE Book, "Service Level Objectives": https://sre.google/sre-book/service-level-objectives/
- Google SRE Book, "Embracing Risk": https://sre.google/sre-book/embracing-risk/
- Google SRE Workbook, "Error Budget Policy": https://sre.google/workbook/error-budget-policy/
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/
- Prometheus documentation, "Alerting rules": https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus documentation, "Query functions": https://prometheus.io/docs/prometheus/latest/querying/functions/
- Python documentation, "dataclasses": https://docs.python.org/3/library/dataclasses.html
- Python documentation, "property": https://docs.python.org/3/library/functions.html#property
- OneUptime SRE solution page: https://oneuptime.com/solutions/sre

## Issues Found
- The Python `budget_consumed` property returned `100.0` whenever `allowed_failures` was `0`, even when `failed_requests` was also `0`. This made low-traffic services with no failures appear to have consumed their full error budget. Changed the zero-allowed-failures branch to return `0.0` when there are no failed requests, and `100.0` when failures occurred.
- The Python example imported `datetime` and `timedelta` but did not use them. Removed the unused import to keep the example accurate and executable without distracting unused symbols.
- The Python example printed the error budget percentage using the raw floating-point value, which produced output such as `0.10000000000000009%`. Changed the print formatting to `:.3f` so the example output matches the intended `0.100%` value.

## Review Notes
- The updated Python snippet was executed successfully with Python 3.12.3, including an additional low-traffic edge-case check.
- Both YAML snippets were parsed successfully with PyYAML.
- `promtool` was not installed in the local environment, so Prometheus alerting syntax and PromQL function usage were checked against the official Prometheus documentation instead of local `promtool check rules`.
- The burn-rate examples are technically consistent with Google SRE guidance and the stated 30-day SLO window, though production alerting is usually improved by using multi-window, multi-burn-rate alerts.
