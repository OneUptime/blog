# Validation Summary: How to Configure Kustomization Wait for Ready in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization custom resources
- Kubernetes
- Kustomize
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux events` reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl wait` reference and Kubernetes status/readiness behavior: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The post stated that the default `spec.timeout` is 5 minutes. Flux's Kustomization API reference states that `.spec.timeout` defaults to the Kustomization's `.spec.interval` duration, so the timeout section was corrected.
- The post described specific health behavior for several resource types, including Services being ready when endpoints are available. Flux documents health checks in terms of supported resource kinds and kstatus-compatible readiness, so this was revised to avoid unsupported per-kind claims and to include the documented supported kinds and CEL health check expressions.
- The "Disabling Wait Temporarily" example used `flux suspend` and `flux resume`, which pauses and resumes reconciliation but does not disable `spec.wait`. The example was changed to patch `spec.wait` to `false`, reconcile, and then patch it back to `true`.

## Review Notes
The main `spec.wait`, `spec.healthChecks`, `spec.dependsOn`, and Flux CLI event/status commands are consistent with the current Flux documentation. In a real GitOps workflow, temporary `kubectl patch` changes should usually be mirrored back into Git or reverted promptly to avoid drift.
