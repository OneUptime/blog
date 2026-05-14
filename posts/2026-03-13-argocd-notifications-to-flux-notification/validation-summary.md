# Validation Summary: How to Map ArgoCD Notifications to Flux Notification Controller

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD Notification Controller
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, and custom resources
- Slack notifications
- PagerDuty notifications
- GitHub commit status updates
- Flux CLI
- kubectl

## Sources Consulted
- Flux Notification Controller Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Controller Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux monitoring alerts guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux CLI `flux get alert-providers` documentation: https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Flux CLI `flux get alerts` documentation: https://fluxcd.io/flux/cmd/flux_get_alerts/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications service overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Notifications PagerDuty V2 documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo CD Notifications triggers and templates catalog: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/notifications/catalog/

## Issues Found
- Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation shows `Provider` and `Alert` as `notification.toolkit.fluxcd.io/v1beta3`; updated all Flux `Provider` and `Alert` manifests accordingly.
- The Slack Flux provider example used an incoming webhook-style secret key named `address` and omitted `spec.address`; updated it to the documented Slack bot token secret key `token` and `spec.address: https://slack.com/api/chat.postMessage`.
- The prerequisite referred specifically to Slack webhook URLs; updated it to Slack bot tokens to match the Flux Slack provider example.
- The Argo CD PagerDuty example mixed the older `pagerduty` service with PagerDuty Events API v2 template fields; updated it to `service.pagerdutyv2`, `pagerdutyv2`, `serviceKeys`, and a required `source` field.
- The Flux PagerDuty provider example used a secret reference for the integration key; updated it to the documented `address: https://events.pagerduty.com` and `channel: <integrationKey>` configuration.
- The verification command `flux get providers` is not the documented Flux CLI command; changed it to `flux get alert-providers`.
- The conclusion described Argo CD notification trigger conditions as "Lua-like"; changed this to "expression-based" to match Argo CD's documented trigger condition model.

## Review Notes
- The post is technically relevant and includes concrete commands and Kubernetes manifests, so it was reviewed as a code/configuration tutorial.
- Flux `spec.summary` is still accepted in the documented Alert examples, but Flux docs note that event metadata is preferred for richer payload customization in newer configurations.
