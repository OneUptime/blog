# Validation Summary: How to Create Alert Duration Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules
- PromQL
- Prometheus rule groups and evaluation intervals
- Alertmanager routing and receivers
- promtool rule validation and unit tests
- YAML configuration

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording/rule group documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus rule unit testing documentation: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- promtool 3.11.3 from the official `prom/prometheus:latest` Docker image
- amtool from the official `prom/alertmanager:latest` Docker image

## Issues Found
- The first alert state diagram showed a separate Prometheus `Resolved` state. Prometheus alerting rules use inactive, pending, and firing states, so the extra state was removed.
- The global `scrape_interval` comment stated it should be less than or equal to `evaluation_interval`. This is common guidance, not a Prometheus requirement, so the wording was softened.
- Error-rate examples returned ratios while annotations displayed percentages. The affected expressions now multiply by 100 and use percentage thresholds.
- The pending-duration meta-alert used `ALERTS_FOR_STATE`, which is internal and not covered by the public alerting-rule docs. It now uses the documented `ALERTS{alertstate="pending"}` synthetic series with `min_over_time`.
- The off-hours PromQL example used `not (...)`, but PromQL has no unary `not` operator. It now uses explicit hour and day-of-week comparisons.
- The Alertmanager `resolve_timeout` comment incorrectly described notification delay behavior. It now matches the documented meaning: resolving alerts from clients that do not send `EndsAt`.
- Alertmanager route examples used deprecated `match` syntax. They now use `matchers`.
- The PagerDuty example used `service_key`; it was updated to the current `routing_key` field for PagerDuty Events API v2 integrations.
- Memory and disk examples returned ratios while descriptions displayed percentages. The expressions now return percentage values.
- The promtool unit-test example omitted labels and annotations that Prometheus includes in expected alerts. The expected alert now includes the inherited `job` label, the configured `team` label, and all configured annotations.
- The "evaluation interval longer than for duration" pitfall incorrectly said the alert can never fire. It was corrected to explain that firing is delayed until a later evaluation.

## Review Notes
- `promtool promql format` successfully parsed the corrected PromQL examples checked during review.
- The Alertmanager example validated successfully with `amtool check-config`.
- The corrected promtool unit-test example passed with Prometheus 3.11.3.
