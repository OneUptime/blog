# Validation Summary: How to Configure Flux Alerts for Deployment Success Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Alert and Provider resources
- Flux Kustomization, HelmRelease, and GitRepository events
- Kubernetes custom resources and events
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux notification-controller options: https://fluxcd.io/flux/components/notification/options/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux kustomize-controller source and generated Kustomization docs: https://github.com/fluxcd/kustomize-controller
- Flux source-controller source and generated GitRepository docs: https://github.com/fluxcd/source-controller
- Flux helm-controller source: https://github.com/fluxcd/helm-controller

## Issues Found
- The post implied success notifications always confirm that changes were applied. Flux `info` success events can also mean a reconciliation completed successfully without a new deployment change. Updated the introduction and summary to distinguish successful reconciliation from newly applied revisions.
- The combined source/deployment alert did not include current GitRepository source update messages. Flux source-controller emits new artifact messages such as `stored artifact for commit ...`, so the Step 4 inclusion list now includes `^stored artifact.*`.
- The post used outdated or non-matching no-change/artifact exclusion examples such as `^stored artifact.*same revision$` and `^Reconciliation finished.*no changes$`. Updated the combined pipeline exclusions to match current source-controller no-change and artifact-up-to-date messages.
- The post included `^Applied revision:.*` as an Alert message filter. Current kustomize-controller uses `Applied revision` as the Ready condition message, while the success event message is `Reconciliation finished ...`. Removed that filter from the Alert examples.

## Review Notes
Flux Alert `eventSeverity: info` forwards all severities unless inclusion and exclusion filters narrow the messages. The examples now rely on message filters for success-like events, but operators should still test the exact event messages produced by their installed Flux controller versions.
