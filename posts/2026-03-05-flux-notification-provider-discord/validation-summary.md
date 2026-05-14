# Validation Summary: How to Configure Flux Notification Provider for Discord

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets and kubectl
- Discord incoming webhooks
- GitOps notifications

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux get alert-providers` reference: https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Flux CLI `flux get alerts` reference: https://fluxcd.io/flux/cmd/flux_get_alerts/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Discord Webhook Resource documentation: https://docs.discord.com/developers/resources/webhook

## Issues Found
- The Provider and Alert manifests used `apiVersion: notification.toolkit.fluxcd.io/v1`, but the current Flux documentation lists Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`; `notification.toolkit.fluxcd.io/v1` currently covers Receiver. Updated all Provider and Alert snippets to `notification.toolkit.fluxcd.io/v1beta3`.
- The verification step said to check that the Provider and Alert were "ready" using `kubectl get`. Flux documents status-oriented CLI commands for these resources as `flux get alert-providers` and `flux get alerts`. Updated the text so `kubectl get` checks resource existence and added the Flux CLI status commands.

## Review Notes
- The local environment did not have `kubectl` or `flux` installed, so command validation was performed against official command references rather than local `--help` output.
- No live Kubernetes cluster or Discord webhook was available for an end-to-end notification test.
