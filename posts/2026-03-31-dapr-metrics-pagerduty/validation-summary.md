# Validation Summary: How to Use Dapr Metrics with PagerDuty

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar metrics)
- Prometheus (metrics collection and alerting rules via PrometheusRule CRD)
- Alertmanager (alert routing and PagerDuty integration)
- PagerDuty (incident management via Events API v2)
- Kubernetes (Secret manifest, prometheus-operator CRDs)

## Sources Consulted
- Alertmanager configuration documentation — pagerduty_configs fields (`routing_key`, `description`, `severity`, `details`): https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config
- Alertmanager API v2 specification (POST /api/v2/alerts): https://prometheus.io/docs/alerting/latest/clients/
- PagerDuty Events API v2 endpoint and integration types: https://developer.pagerduty.com/docs/events-api-v2/overview/
- PagerDuty integration setup (Events API v2 vs Prometheus integration type): https://support.pagerduty.com/docs/services-and-integrations
- Prometheus `absent()` function semantics: https://prometheus.io/docs/prometheus/latest/querying/functions/#absent
- Kubernetes Secret API (stringData field): https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found

### 1. Wrong PagerDuty integration type (Step 2)
- **What was wrong:** The post instructed users to add a PagerDuty integration of type "Prometheus". However, Alertmanager's `pagerduty_configs` with `routing_key` speaks the Events API v2 protocol natively, not the Prometheus webhook format. Using the "Prometheus" integration type would produce an incompatible integration key.
- **What was changed:** Changed "Prometheus" to "Events API v2" in step 2 of the PagerDuty setup instructions.
- **Why:** The `routing_key` field in Alertmanager's `pagerduty_configs` requires an Events API v2 integration key from PagerDuty. The "Prometheus" integration type in PagerDuty expects a different webhook format and would not work with this Alertmanager configuration.

### 2. Undefined default receiver
- **What was wrong:** The top-level `receiver: 'default'` in the alertmanager.yaml config referenced a receiver that was never defined in the `receivers:` list. Alertmanager validates that all referenced receivers exist at startup and would fail with: `undefined receiver "default" used in route`.
- **What was changed:** Changed `receiver: 'default'` to `receiver: 'dapr-warning-pagerduty'`, which is defined in the receivers list and is an appropriate fallback for unmatched alerts.
- **Why:** Alertmanager requires every referenced receiver to be defined. Using `dapr-warning-pagerduty` as the default ensures unmatched alerts still reach PagerDuty at warning severity rather than being dropped or causing a startup failure.

## Review Notes
- The `absent(up{job="dapr-operator"} == 1)` PromQL expression is correct — it fires when the operator target is missing or reporting down (up=0). A more explicit alternative would be `absent(up{job="dapr-operator"}) or up{job="dapr-operator"} == 0`, but the current form is valid.
- The Kubernetes Secret uses `"{{ PAGERDUTY_KEY }}"` as a placeholder in the routing_key field. This is treated as a literal string by Kubernetes; the post should ideally note this requires Helm or envsubst for variable substitution. However, it reads clearly as a placeholder in context.
- The `dapr-slo-pagerduty` receiver is referenced in the routing snippet but not defined. This is acceptable since the snippet is illustrative, but readers should be aware they need to define it.
- The `match` and `match_re` routing fields are deprecated in newer Alertmanager versions in favor of `matchers`, but remain functional and widely used.
