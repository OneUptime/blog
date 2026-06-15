# Validation Summary: How to Deploy with Kustomize in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kustomize
- Kubernetes manifests
- kubectl
- GitOps

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl reference: `kubectl kustomize`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes kubectl reference: `kubectl apply`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Argo CD documentation: Kustomize user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD documentation: ApplicationSet List generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD documentation: ApplicationSet Go Template: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Kustomize v5.7.1 local build validation using a temporary binary from the official Kubernetes SIGs Kustomize release.

## Issues Found
- The repository tree omitted `overlays/production/resources-patch.yaml`, even though the production overlay referenced it. Added the missing file name to the tree.
- The overlay examples used Kustomize `commonLabels`, which emits a deprecation warning in current Kustomize. Replaced it with the current `labels` syntax and `includeSelectors: true` to preserve the old selector-labeling behavior.
- The Kustomize version-selection text implied any version could be selected directly. Updated it to say a configured version can be specified, matching Argo CD's requirement that extra Kustomize versions be registered.
- Two JSON Patch examples added annotation child keys under `/metadata/annotations` or `/spec/template/metadata/annotations` without first ensuring the annotations map existed. Changed them to add the full annotations map so they work against the shown base Deployment.
- The ApplicationSet example used the older fasttemplate-style `{{env}}` and `{{cluster}}` placeholders. Added `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and updated placeholders to `{{.env}}` and `{{.cluster}}`.

## Review Notes
The corrected development and production overlays were validated with `kustomize build` using Kustomize v5.7.1. A focused patch/component harness was also built successfully to confirm the JSON Patch and Component examples render as intended. `kubectl` and `argocd` were not installed in the workspace, so their commands were checked against official CLI documentation rather than executed locally.
