# Validation Summary: How to Use Post-Build Substitution for Region-Specific Config in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux post-build substitution
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes Deployments
- Kubernetes Ingress
- Kubernetes PersistentVolumeClaims
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes API reference: https://kubernetes.io/docs/reference/kubernetes-api/

## Issues Found
- The post stated that earlier entries in `postBuild.substituteFrom` take precedence over later entries. Current Flux documentation says inline `substitute` values take precedence over `substituteFrom`, and later `substituteFrom` entries overwrite earlier ones. Updated the precedence explanation.
- The verification command used `flux get kustomization app-platform`. The official Flux CLI command for Kustomization status is `flux get kustomizations`. Updated the example to `flux get kustomizations --namespace flux-system`.

## Review Notes
The Flux Kustomization API version, `postBuild.substitute` and `postBuild.substituteFrom` fields, ConfigMap and Secret variable-source examples, Kubernetes resource snippets, and `kubectl get ... -o jsonpath=...` examples are consistent with current official documentation.
