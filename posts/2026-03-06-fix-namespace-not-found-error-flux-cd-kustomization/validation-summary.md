# Validation Summary: How to Fix 'namespace not found' Error in Flux CD Kustomization

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kustomize
- Kubernetes Namespaces
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/

## Issues Found
- The Kustomize `resources` example said the Namespace must be listed first. The important requirement is that the Namespace manifest is included in the Kustomization or already exists; Flux applies built resources and Kustomize resource list order is not the primary guarantee. Changed the comment to say to include the namespace with the resources that use it.
- The multi-layer dependency section said the pattern was infrastructure, then namespaces, then applications, but the recommended structure and the namespace-ordering topic require namespaces before dependent workloads. Updated the dependency chain to create namespaces first, then infrastructure, then apps.
- The bootstrap section recommended Flux `healthChecks` on `Namespace` resources. Flux documentation describes health checks for workload, config, CRD, Flux, and kstatus-compatible resources, and does not list Namespace as a supported built-in health-check target. Reworked the example to health-check controller Deployments instead and clarified that `dependsOn` already gates Kustomizations on dependency readiness.

## Review Notes
The Flux CLI commands in the post match the official command forms, but the Flux CLI was not installed in the local environment, so command verification was performed against official Flux CLI documentation rather than local `--help` output.
