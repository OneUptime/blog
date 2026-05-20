# Validation Summary: How to Send ArgoCD Notifications to Alertmanager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps and annotations
- Prometheus Alertmanager
- Alertmanager API v2
- Alertmanager routing, inhibition, Slack, and PagerDuty receivers
- curl and jq debugging commands

## Sources Consulted
- Argo CD Notifications Alertmanager service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/alertmanager/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/subscriptions/
- Prometheus Alertmanager client / API v2 documentation: https://next.prometheus.io/docs/alerting/latest/clients/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The health degraded alert used `health_status` as an Alertmanager label, then changed that label to `Healthy` in the resolved alert. Alertmanager identifies alerts by their label set, so this would not resolve the original `Degraded` alert. Removed `health_status` from both firing and resolved labels so the label sets match.
- The health resolved template used `.app.status.operationState.finishedAt` for `endsAt`. Health recovery is not always tied to the latest sync operation, so that value can be missing or stale. Changed it to the notification time using Argo CD's template time function and RFC3339 formatting.
- The Alertmanager routing example used deprecated `match` fields. Replaced them with current `matchers` syntax.
- The Alertmanager inhibition example used deprecated `source_match` and `target_match` fields. Replaced them with current `source_matchers` and `target_matchers` syntax.

## Review Notes
Alertmanager's API documentation recommends that clients continuously resend active alerts until they are resolved. Argo CD notification triggers are event-oriented, so teams using this pattern should test alert lifetime behavior against their Alertmanager `resolve_timeout` and notification trigger cadence.
