# Validation Summary: How to Deploy Plain YAML Manifests with Flux Kustomization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization custom resource
- Kustomize
- Kubernetes YAML manifests
- Kubernetes Deployment, Service, ConfigMap, Namespace, and Ingress resources
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The "When to Add a kustomization.yaml" section incorrectly stated that `commonLabels`, `commonAnnotations`, `namePrefix`, and `images` require a `kustomization.yaml`. Current Flux Kustomization supports equivalent or direct fields for common metadata, name prefix/suffix, and image overrides. I changed the examples to Kustomize features that are not exposed directly in the Flux Kustomization spec: `configMapGenerator`, `secretGenerator`, `replacements`, and `replicas`.

## Review Notes
- The main claim that Flux auto-generates a `kustomization.yaml` for plain Kubernetes YAML under `.spec.path` is consistent with the Flux documentation.
- The CLI commands `flux reconcile kustomization demo-app --with-source` and `flux get kustomizations demo-app` are consistent with the Flux CLI documentation.
- The Flux `targetNamespace`, `patches`, and `postBuild.substitute` examples use valid current `kustomize.toolkit.fluxcd.io/v1` fields. For `targetNamespace`, the target namespace must already exist or be defined in the Kustomization's rendered manifests.
