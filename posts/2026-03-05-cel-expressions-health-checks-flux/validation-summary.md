# Validation Summary: How to Use CEL Expressions for Custom Health Checks in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kubernetes
- Kustomize
- Common Expression Language (CEL)
- Kubernetes kstatus health assessment
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux events` reference: https://fluxcd.io/flux/cmd/flux_events/
- Kubernetes SIGs cli-utils kstatus package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus

## Issues Found
- The CEL examples used `failed` for a `Ready=False` condition. In Flux `healthCheckExprs`, `failed` represents a failed health state, while kstatus treats a generic `Ready=False` condition as still reconciling. Changed those expressions to `inProgress` so the examples match the surrounding explanation and Flux's health status semantics.
- The discussion of missing `Ready` conditions implied Flux could always infer that the resource should keep waiting. kstatus documentation notes that resources without a `Ready` condition may be treated as reconciled because the library cannot tell whether the resource uses that convention. Updated the wording to say Flux may not be able to infer the intended status.

## Review Notes
The Flux Kustomization fields shown in the examples (`wait`, `healthChecks`, `healthCheckExprs`, `dependsOn`, `timeout`, and `retryInterval`) are current in the v1 API. The Flux CLI commands and flags shown are valid according to the current official CLI reference.
