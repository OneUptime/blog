# Validation Summary: How to Filter Flux Alerts by Event Reason ProgressingWithRetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller
- Flux Alert and Provider custom resources
- Kubernetes custom resources and Secrets
- kubectl
- Flux CLI
- Slack webhook notifications

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux GitRepository documentation for `ProgressingWithRetry`: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The post used `apiVersion: notification.toolkit.fluxcd.io/v1` for `Alert` and `Provider` examples. Current Flux documentation lists `Alert` and `Provider` under `notification.toolkit.fluxcd.io/v1beta3`, so all notification API examples were updated to `v1beta3`.
- The post stated that `inclusionList` and `exclusionList` filter by event reason or by message-or-reason. Flux documentation says these fields filter event message content using Go regular expressions. The text was corrected to describe filtering messages containing `ProgressingWithRetry`.
- The post described `ProgressingWithRetry` as an event reason. Flux documentation shows `ProgressingWithRetry` as a `Reconciling` condition reason on Flux resources when reconciliation retries after a failure. The explanation was corrected while keeping the operational guidance focused on Alert message filters.

## Review Notes
- The `flux reconcile kustomization flux-system --with-source` command and `--with-source` flag match the official Flux CLI documentation.
- The Slack legacy webhook secret using an `address` key matches the Flux provider documentation. Current Flux docs recommend Slack Bot tokens for new Slack integrations, but the legacy incoming webhook pattern is still documented.
