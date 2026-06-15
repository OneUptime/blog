# Validation Summary: How to Implement SLO Monitoring with Prometheus

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus alerting rules
- Alertmanager
- Grafana
- Sloth
- Python requests

## Sources Consulted
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus PromQL operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus template examples: https://prometheus.io/docs/prometheus/latest/configuration/template_examples/
- Sloth CLI generate documentation: https://sloth.dev/usage/cli/
- Sloth getting started example: https://sloth.dev/examples/default/getting-started/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The error budget remaining rules divided SLI series labeled by `service` and `environment` by SLO target series labeled only by `service`, which would not match under Prometheus default vector matching. Updated the expressions to use `on(service) group_left`.
- The error budget remaining examples used the instantaneous 5-minute SLI ratio rather than the 30-day SLO period. Updated them to compute remaining budget from 30-day request and latency windows.
- The burn-rate expressions had incorrect operator grouping: `1 - availability / error_budget` instead of `(1 - availability) / error_budget`. Added parentheses so the recorded value is the error ratio divided by the allowed error budget.
- The alert rules referenced `error_budget:availability:burn_rate:5m` and `error_budget:availability:burn_rate:30m`, but those recording rules were not defined. Added 5-minute and 30-minute burn-rate recording rules.
- The slow-burn alert claimed a 10% monthly budget burn over 3 days but used a 24-hour window and a 2x burn rate. Updated it to use a 3-day long window, 6-hour short window, and 1x burn rate, matching the Google SRE Workbook recommendation.
- A dashboard query labeled as error budget consumption returned raw error ratio. Updated it to divide by the allowed error budget, and kept the raw error-ratio query under a clearer label.
- A comment described a rate recording rule as a counter, and another described rolling-window availability as percentile-based. Updated the wording to match the PromQL shown.

## Review Notes
Promtool and Sloth were not installed in the local environment, so rule validation was performed by reviewing the snippets against official Prometheus and Sloth documentation rather than by executing the CLIs locally. The long-window examples use `sum_over_time` over precomputed rate recording rules; this is common for dashboard-style approximations, but production SLO implementations may prefer direct long-window rates, increases, or a generator such as Sloth for consistent rule generation.
