# Validation Summary: How to Configure Kustomization Health Checks in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kubernetes
- Kustomize
- kstatus health assessment
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux create kustomization` reference: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Kubernetes SIGs cli-utils kstatus package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus
- Kubernetes SIGs cli-utils kstatus source for built-in health rules: https://raw.githubusercontent.com/kubernetes-sigs/cli-utils/v0.37.2/pkg/kstatus/status/core.go

## Issues Found
- The post said Service health checks verify that a Service has endpoints. Flux's built-in kstatus Service rule does not check endpoints; it considers Services ready and, for `LoadBalancer` Services, waits only for `spec.clusterIP`. Updated the Service health description and the Service example comment.
- The debugging command `flux get kustomizations my-app` was not aligned with the current official Flux CLI synopsis, which documents `flux get kustomizations [flags]` for listing statuses. Updated it to `flux get kustomizations --namespace flux-system`.

## Review Notes
The YAML examples use the current `kustomize.toolkit.fluxcd.io/v1` Kustomization API and valid fields including `spec.healthChecks`, `spec.wait`, and `spec.timeout`. Flux also supports `spec.healthCheckExprs` for custom CEL-based health checks, which could be covered in a future advanced article but is not required to make this post correct.
