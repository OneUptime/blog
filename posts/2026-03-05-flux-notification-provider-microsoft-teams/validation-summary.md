# Validation Summary: How to Configure Flux Notification Provider for Microsoft Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets and kubectl
- Microsoft Teams webhook workflows
- Flux CLI reconciliation

## Sources Consulted
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Microsoft Teams Incoming Webhook and Workflows documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Teams connectors deprecation guidance: https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors

## Issues Found
- The Flux Provider and Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`, but current Flux documentation lists Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert manifests to `v1beta3`.
- The Teams setup described creating an Incoming Webhook connector and used an old `outlook.office.com/webhook/...` URL pattern. Microsoft documentation now directs webhook users toward Teams Workflows because Microsoft 365 connectors are nearing deprecation. Updated the setup, example URL, secret command, troubleshooting notes, and conclusion to use a Teams webhook workflow URL.
- The explanation stated that Flux always sends Microsoft Teams Adaptive Card payloads. Flux formats workflow URLs as Adaptive Card messages, while deprecated connector URLs are handled differently based on the webhook host. Updated the wording to apply specifically to webhook workflow URLs.

## Review Notes
- The `flux reconcile kustomization flux-system --with-source` command and `--with-source` flag are valid according to Flux CLI documentation.
- The `address` key in the Secret and the `msteams` Provider type match Flux documentation.
- Flux also supports deprecated Office 365 Connector webhook URLs for `msteams`, but Teams Workflows are the more current Microsoft-recommended path.
