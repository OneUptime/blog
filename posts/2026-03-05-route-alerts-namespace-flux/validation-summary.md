# Validation Summary: How to Route Alerts to Different Channels Based on Namespace in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Alert and Provider custom resources
- Kubernetes custom resources and namespaces
- Slack notifications
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux reconcile kustomization CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux alerts monitoring guide: https://fluxcd.io/flux/monitoring/alerts/

## Issues Found
- The post used `notification.toolkit.fluxcd.io/v1` for `Alert` and `Provider` resources. Flux currently documents outbound `Alert` and `Provider` resources under `notification.toolkit.fluxcd.io/v1beta3`; `v1` is used for Receiver resources. Updated all Alert and Provider manifests to `notification.toolkit.fluxcd.io/v1beta3`.
- The post used `spec.summary`, which Flux documents as deprecated and planned for removal in the Alert API v1 GA. Updated alert examples and verification output to use `spec.eventMetadata.summary`.
- The Slack provider examples specified channels with a webhook-style secret name but omitted the Slack API address. Flux documents Slack channel selection with `address: https://slack.com/api/chat.postMessage` and a token secret. Updated the examples to include the Slack API address and use a `slack-bot-token` secret reference.
- The verification command `flux reconcile kustomization apps --with-source` did not include a namespace despite the surrounding text saying to reconcile in a specific namespace. Updated it to `flux reconcile kustomization apps -n apps --with-source`.

## Review Notes
- The namespace routing approach is technically correct: Flux Alert `eventSources` can select Flux objects by kind, name wildcard, and namespace.
- On multi-tenant clusters, Flux can disable cross-namespace references with `--no-cross-namespace-refs=true`; the examples assume cross-namespace event source references from `flux-system` are allowed.
