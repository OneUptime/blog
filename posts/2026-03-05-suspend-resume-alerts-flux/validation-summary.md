# Validation Summary: How to Suspend and Resume Alerts in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux Alert custom resources
- Kubernetes kubectl
- GitOps YAML manifests
- jq

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `flux suspend alert` reference: https://fluxcd.io/flux/cmd/flux_suspend_alert/
- Flux CLI `flux resume alert` reference: https://fluxcd.io/flux/cmd/flux_resume_alert/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The declarative Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Flux's current notification API reference lists Alert under `notification.toolkit.fluxcd.io/v1beta3`; the `v1` notification API currently documents Receiver, not Alert. Updated both Alert YAML snippets to `apiVersion: notification.toolkit.fluxcd.io/v1beta3`.

## Review Notes
The `spec.suspend` field, `providerRef`, `eventSeverity`, `eventSources`, kubectl patch commands, JSONPath checks, custom-column output, and `flux reconcile kustomization --with-source` command align with the official Flux and Kubernetes documentation consulted. Flux also provides native `flux suspend alert` and `flux resume alert` commands, but the kubectl-based workflow in the post is valid.
