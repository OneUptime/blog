# Validation Summary: How to Use flux events to View Recent Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes events
- Kubernetes custom resources
- GitOps
- HelmRelease
- Kustomization
- GitRepository

## Sources Consulted
- Flux CLI documentation for `flux events`: https://fluxcd.io/flux/cmd/flux_events/
- Flux monitoring documentation for events: https://fluxcd.io/flux/monitoring/events/
- Flux CLI documentation for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI documentation for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/

## Issues Found
- The GitRepository source fetch examples used `ArtifactFailed` for Git checkout, authentication, and branch lookup failures. Updated those examples to use `GitOperationFailed`, which is the reason shown in the official Flux GitRepository and events documentation for failed Git operations.
- Several status-check examples used `flux get kustomization <name>`. Updated them to `flux get kustomizations`, matching the current official Flux CLI documentation for Kustomization status inspection.

## Review Notes
- The official Flux documentation marks `flux events` and `flux logs` as preview commands, so their behavior may change in future Flux releases.
- Kubernetes events are short-lived by default; the post's event retention note is consistent with Kubernetes/Flux event usage.
