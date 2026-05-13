# Validation Summary: How to Fix resource mapping not found Error in Flux Kustomization

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux Kustomization
- Kubernetes
- Custom Resource Definitions
- kubectl
- cert-manager

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- cert-manager Certificate API documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The health-check section described the example as ensuring "CRD readiness", but the snippet checks the `cert-manager` Deployment. Updated the heading and explanation to say health checks make the CRD/operator Kustomization Ready so dependent Kustomizations using `dependsOn` wait for it.

## Review Notes
The Flux `kustomize.toolkit.fluxcd.io/v1` API version, `dependsOn`, `healthChecks`, `prune`, `sourceRef`, and `flux reconcile kustomization my-app --with-source` usage are current and match the official Flux documentation. The cert-manager example uses the current `cert-manager.io/v1` Certificate API.
