# Validation Summary: How to Filter Flux Alerts by Kustomization Name

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux Alert and Provider custom resources
- Flux Kustomization custom resources
- Kubernetes
- kubectl
- Slack incoming webhooks

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification-controller options: https://fluxcd.io/flux/components/notification/options/
- Flux `reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The Alert and Provider examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation lists Alert and Provider resources under `notification.toolkit.fluxcd.io/v1beta3`, while the v1 API reference is documented separately. Updated all Alert and Provider manifests to `notification.toolkit.fluxcd.io/v1beta3`.
- The prerequisites said Flux v2.0 or later, which was too broad for the v1beta3 manifests. Updated the prerequisite to require the `notification.toolkit.fluxcd.io/v1beta3` API to be available.
- The cross-namespace section referenced a non-existent `spec.eventSources[].crossNamespaceSelectors` notification controller setting. Replaced this with the documented `--no-cross-namespace-refs=true` controller flag and clarified its effect.
- The Slack incoming webhook Provider example included `channel: flux-alerts`. Flux's documented legacy Slack webhook example uses a Secret containing the `address` and a `slack` Provider with `secretRef`; the incoming webhook itself determines the destination. Removed the `channel` field and changed later wording from provider channel to provider destination.

## Review Notes
The remaining `spec.eventSources` examples, `eventSeverity` usage, namespace behavior, and `flux reconcile kustomization app-frontend` command match current Flux documentation. The `kubectl get` and `kubectl describe` commands use standard Kubernetes command syntax.
