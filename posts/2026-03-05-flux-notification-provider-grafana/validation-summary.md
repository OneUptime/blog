# Validation Summary: How to Configure Flux Notification Provider for Grafana

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets and kubectl
- Grafana annotations API
- Grafana service account tokens
- Grafana Cloud

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Grafana annotations documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- Grafana Annotations HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/

## Issues Found
- The Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but Flux's current `Provider` and `Alert` APIs are documented as `notification.toolkit.fluxcd.io/v1beta3`. Updated all `Provider` and `Alert` manifests to `v1beta3`.
- The Grafana provider examples used the Grafana root URL, and troubleshooting said not to include an `/api` path. Flux's Grafana provider documentation expects the annotations endpoint, such as `https://<grafana-url>/api/annotations`. Updated all Grafana addresses and troubleshooting guidance accordingly.
- The token setup guidance emphasized Grafana API keys. Grafana documentation states service accounts replace API keys as the primary way to authenticate applications with the Grafana HTTP API. Updated the prerequisite and setup step to prefer service account tokens while keeping legacy API keys as an older-installation option.
- The annotation tag examples were too vague. Flux documents Grafana tags such as `flux`, `kind: <kind>`, `name: <name>`, and `namespace: <namespace>`. Updated the dashboard annotation query example to use concrete Flux tag formats.

## Review Notes
The `flux reconcile kustomization flux-system --with-source` command and `eventSeverity: info` / `eventSeverity: error` usage match Flux CLI and Alert documentation. `kubectl create secret generic` with a `token` key is consistent with Flux's Grafana provider authentication examples.
