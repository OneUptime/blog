# Validation Summary: How to Configure Alertmanager Routing Trees for Multi-Team Alert Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager routing trees
- Alertmanager receivers and notification integrations
- Alertmanager inhibition rules
- Alertmanager time intervals and mute intervals
- kube-prometheus-stack Helm chart configuration
- Kubernetes Secrets
- amtool CLI

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager concepts documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager README and amtool usage: https://github.com/prometheus/alertmanager
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The routing process description incorrectly implied that a matched parent route immediately sends to its receiver and that `continue: false` controls child route evaluation. Updated the explanation to reflect Alertmanager's routing tree behavior: child routes are evaluated in order, matching children are traversed recursively, `continue` controls sibling route evaluation, and a route's receiver handles the alert when no child routes match.
- The post described each route as sending to one or more receivers. Updated this to a single receiver per route, while preserving the separate multi-channel receiver example.
- Several examples used deprecated Alertmanager `match` and `match_re` route fields. Replaced them with the current `matchers` list syntax.
- The inhibition examples used deprecated `source_match`, `target_match`, and `target_match_re` fields. Replaced them with `source_matchers` and `target_matchers`.
- The time-based routing section said Alertmanager does not natively support time-based routing. Updated it to use native `active_time_intervals` and `time_intervals`, and limited label-based shift routing to custom shift logic beyond fixed intervals.
- The mute timing example defined intervals under the deprecated top-level `mute_time_intervals` field. Updated the interval definitions to use top-level `time_intervals` while keeping route-level `mute_time_intervals`, which is the correct route reference field.
- The `Continue vs Stop Matching` heading and comments referred to child route continuation. Updated them to sibling route continuation.

## Review Notes
- PagerDuty `service_key` remains valid for PagerDuty integrations using the Prometheus integration type. For newer PagerDuty Events API v2 integrations, `routing_key` is usually the preferred key field.
- The example Kubernetes Secret and kube-prometheus-stack values are illustrative. A real deployment may need chart-specific settings such as externally managed config secrets or AlertmanagerConfig resources depending on how the stack is installed.
