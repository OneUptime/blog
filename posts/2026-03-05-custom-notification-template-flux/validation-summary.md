# Validation Summary: How to Create a Custom Notification Template in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Alert and Provider custom resources
- Kubernetes manifests
- Slack notifications
- Generic webhook notifications
- Flux CLI
- kubectl

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post said event metadata from source resources is automatically included. Flux documents automatic user-defined metadata from Flux objects via `event.toolkit.fluxcd.io/` annotations, so the wording was changed to "event metadata annotations" to avoid implying that arbitrary source-object metadata is copied.
- The custom webhook section said the example transforms Flux events into a custom Slack message format, but the snippet only routes events to a generic provider. The wording was changed to describe the example as an alert that routes Flux events to the custom webhook handler.
- The Slack channel examples used `channel` with a `slack-webhook` secret and no Slack API address. Flux's documented multi-channel Slack configuration uses `address: https://slack.com/api/chat.postMessage` with a bot token, so the examples were updated to include the Slack API address and reference a `slack-token` secret.

## Review Notes
The `notification.toolkit.fluxcd.io/v1beta3` Alert and Provider examples use current Flux fields. The `spec.eventMetadata.summary` pattern is valid as event metadata, and the older top-level `spec.summary` field is deprecated and not used in the post.
