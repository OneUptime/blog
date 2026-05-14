# Validation Summary: How to Configure Flux Notification Provider for Sentry

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD notification-controller
- Flux `Provider` and `Alert` custom resources
- Kubernetes Secrets and `kubectl`
- Sentry DSNs and ingest endpoints

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Sentry Relay project configuration documentation: https://docs.sentry.io/product/relay/projects/

## Issues Found
- The Flux `Provider` and `Alert` manifests used `apiVersion: notification.toolkit.fluxcd.io/v1`, but Flux's current notification API reference only lists `Receiver` under `v1`; `Provider` and `Alert` are documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert snippets to `v1beta3`.
- The introduction said Sentry uses Flux events to mark releases. Flux's Sentry provider sends Sentry events for `error` severity and transaction events for `info` severity; it does not create Sentry releases. Updated the wording to describe the actual event and transaction behavior.
- The guide said it covers "generating" a DSN, but the steps direct the reader to copy an existing project DSN. Updated the wording to "copying a DSN."
- The troubleshooting section said a DSN contains an organization slug. Sentry DSNs contain a public key, ingest host, and project ID; the ingest host may include an organization ID, not the slug. Updated the DSN checklist accordingly.

## Review Notes
The remaining commands and configuration are consistent with the consulted documentation. `eventSeverity: info` forwards all events, including errors, and the Flux CLI `flux reconcile kustomization <name> --with-source` flag is documented.
