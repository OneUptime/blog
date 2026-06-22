# Validation Summary: How to Build SLO Dashboards with Loki Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Grafana dashboards
- Grafana alerting
- Loki recording rules
- SLO, SLI, error budget, and burn-rate concepts

## Sources Consulted
- Grafana Loki LogQL log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki recording rules documentation: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana Loki template variables documentation: https://grafana.com/docs/grafana/latest/datasources/loki/template-variables/
- Grafana recording rules documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-recording-rules/
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The post stated that a burn rate greater than 14.4 would exhaust a 30-day, 99.9% SLO error budget in 2 hours. This is incorrect. Official SRE guidance maps a 14.4 burn rate to consuming 2% of a 30-day error budget in 1 hour. I corrected the comment in the LogQL example and adjusted the alert annotation so it no longer claims exhaustion in less than 2 hours.
- The burn-rate alert snippet was labeled as a "Grafana alert rule" even though the YAML block is an illustrative set of alert rule settings, not a complete Grafana provisioning file. I clarified the comment to say "Grafana alert rule settings."

## Review Notes
The LogQL examples are consistent with Loki's documented JSON parser, label filter expressions, range aggregations, and recording rule syntax. In production, teams should consider filtering parser errors with `__error__=""` after parsing stages when logs may contain malformed JSON or non-numeric field values, because Loki metric queries cannot contain pipeline errors.
