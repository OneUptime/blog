# Validation Summary: How to Configure HelmRelease with disableOpenAPIValidation in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Helm
- Kubernetes OpenAPI validation
- Kubernetes CRDs
- kubectl

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes OpenAPI v3 and Server Side Field Validation GA announcement: https://kubernetes.io/blog/2023/04/24/openapi-v3-field-validation-ga/

## Issues Found
- The post described `disableOpenAPIValidation` as bypassing Kubernetes API-server validation. Updated the explanation to clarify that the field disables Helm's rendered-template validation against the Kubernetes OpenAPI schema; the API server still performs its own validation and admission checks.
- The practical example used `createNamespace: true` while placing the HelmRelease in the target namespace. Updated the example to place the HelmRelease in `flux-system` and set `targetNamespace: istio-system`, matching Flux's documented `createNamespace` behavior.
- The CRD lifecycle explanation said `crds: CreateReplace` handles the full CRD lifecycle. Updated this to say it installs and replaces CRDs, because Flux documents that CRDs are not deleted by this policy.
- The diagnostic guidance implied that any failed server-side dry run could be solved by disabling OpenAPI validation. Updated the text to distinguish Helm/Flux OpenAPI validation failures from API-server dry-run validation failures.
- The alternative approach used `HelmRelease.spec.dependsOn` to depend on a Flux Kustomization, which is not valid. Replaced it with two Flux Kustomizations using Kustomization `dependsOn`, and kept the HelmRelease CRD policy set to `Skip`.

## Review Notes
The Flux and Helm fields used in the remaining examples are current for Flux HelmRelease `helm.toolkit.fluxcd.io/v2`. The example chart names and versions are illustrative and were not validated as installable chart releases.
