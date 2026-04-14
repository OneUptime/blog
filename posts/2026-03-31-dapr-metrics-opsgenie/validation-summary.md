# Validation Summary: How to Use Dapr Metrics with OpsGenie

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus Alertmanager
- Atlassian OpsGenie (alert management / on-call scheduling)
- Kubernetes (secrets, port-forwarding)
- curl (API testing)

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- OpsGenie Alert API documentation: https://docs.opsgenie.com/docs/alert-api
- OpsGenie integration guide for Prometheus: https://support.atlassian.com/opsgenie/docs/integrate-opsgenie-with-prometheus/
- Alertmanager environment variable substitution issues: https://github.com/prometheus/alertmanager/issues/2818

## Issues Found

### 1. Missing `default-opsgenie` receiver definition
- **What was wrong:** The main Alertmanager route referenced `receiver: default-opsgenie` but no receiver with that name was defined in the `receivers` list. Alertmanager validates that all referenced receivers exist at startup and would reject this configuration with an error.
- **What was changed:** Added a `default-opsgenie` receiver definition with P2 priority as a catch-all default, placed before the existing `dapr-critical-team` receiver.
- **Why:** Without this receiver, the Alertmanager config is invalid and would not load.

### 2. Invalid environment variable substitution in Kubernetes Secret
- **What was wrong:** The Kubernetes Secret example used `${OPSGENIE_API_KEY}` in the embedded `alertmanager.yaml`. Alertmanager does not support native environment variable substitution — this string would be passed literally as the API key, causing authentication failures.
- **What was changed:** Replaced `${OPSGENIE_API_KEY}` with `YOUR_OPSGENIE_API_KEY` to match the placeholder convention used throughout the rest of the post, making it clear the value must be directly substituted by the user.
- **Why:** Prevents readers from believing Alertmanager will expand environment variables at runtime.

## Review Notes
- The `match` and `match_re` route fields used throughout the post are deprecated in newer versions of Alertmanager in favor of the `matchers` field. They still function correctly but may be removed in a future release. A future update could migrate the examples to use `matchers` syntax (e.g., `matchers: ['severity="critical"']`).
- The Kubernetes Secret section could benefit from mentioning `api_key_file` as an alternative to embedding the API key directly in the config, which is a more secure pattern supported natively by Alertmanager.
- All OpsGenie API details (endpoint URL, auth header format, EU/US endpoints, priority levels, alert payload fields) are accurate.
- All Alertmanager template expressions (`.GroupLabels`, `.CommonAnnotations`) are valid.
- The `kubectl port-forward` and Alertmanager API v2 status check commands are correct.
