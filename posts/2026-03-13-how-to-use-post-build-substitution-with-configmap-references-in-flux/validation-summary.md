# Validation Summary: How to Use Post-Build Substitution with ConfigMap References in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization resources
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes Deployments
- Kubernetes Ingress
- kubectl
- YAML manifests

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference for `kustomize.toolkit.fluxcd.io/v1`: https://v2-0.docs.fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
No technical issues found.

## Review Notes
The examples correctly use `apiVersion: kustomize.toolkit.fluxcd.io/v1`, `spec.postBuild.substituteFrom`, `kind: ConfigMap`, `kind: Secret`, and `optional: true`. Flux documentation confirms that inline `substitute` values take precedence over values loaded from `substituteFrom`, and that later entries in `substituteFrom` override earlier entries for duplicate keys. The referenced ConfigMaps and Secrets should reside in the same namespace as the Kustomization; the examples use `flux-system` consistently.
