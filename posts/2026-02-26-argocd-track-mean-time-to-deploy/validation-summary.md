# Validation Summary: How to Track Mean Time to Deploy with ArgoCD Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Grafana dashboards
- Kubernetes Deployments and Secrets
- Argo CD Notifications
- Git webhooks
- DORA metrics

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Git Webhook Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD Notifications Webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications Triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications Templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD High Availability and scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- DORA metrics guide: https://dora.dev/guides/dora-metrics/

## Issues Found
- The post described `argocd_app_sync_total` as an average sync duration query. This metric is a counter for sync history, so I changed the section to describe sync activity and added an average-duration calculation using `argocd_app_sync_duration_seconds_total` where available.
- The reconciliation section said `argocd_app_reconcile` measures change detection time. Official docs describe it as application reconciliation performance, so I narrowed the wording to the queued reconciliation operation.
- The estimated MTTD query comments implied it included sync and rollout time, but the PromQL only includes reconciliation and Git request duration. I updated the comments to identify it as an Argo CD-observable approximation and note that rollout time needs events or notifications.
- The Argo CD notification trigger accessed `app.status.operationState` without optional chaining. Official trigger examples use optional chaining for that optional field, so I changed it to `app.status?.operationState.phase`.
- The notification webhook payload used `syncDuration` but filled it with `finishedAt`. I changed the field to `syncFinishedAt` so the timestamp is accurately named.
- The notification example omitted the need to subscribe applications to the trigger. I added a minimal subscription annotation example.
- The Git webhook secret example used `argocd-cm`, but Argo CD documents provider webhook secrets under `argocd-secret` or another labeled Secret. I changed the snippet to a Kubernetes Secret using `stringData`.
- The description implied Argo CD metrics alone cover commit-to-production lead time. I changed it to describe the Argo CD-detected portion of the flow.

## Review Notes
The built-in Argo CD metrics can estimate pieces of deployment latency, but true commit-to-healthy-in-production measurement still requires correlating Git commit timestamps with Argo CD sync and Kubernetes health or rollout events. The post now reflects that caveat.
