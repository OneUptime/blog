# Validation Summary: How to Override Kustomize Images in ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Application manifests
- Argo CD CLI
- Argo CD Image Updater
- Kustomize image transformers
- Kubernetes Deployment manifests
- kubectl JSONPath

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo CD documentation: Kustomize user guide - https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD documentation: Application Specification Reference - https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD documentation: `argocd app set` command reference - https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_set/
- Argo CD documentation: `argocd app manifests` command reference - https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD Image Updater documentation: Applications and write-back methods - https://argocd-image-updater.readthedocs.io/en/v0.10.0/configuration/applications/
- Argo CD Image Updater documentation: Image annotations and Kustomize image names - https://argocd-image-updater.readthedocs.io/en/release-0.15/configuration/images/

## Issues Found
- The first full Kubernetes Deployment example omitted required `apps/v1` selector and matching pod template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` so the manifest is structurally valid.
- A Kustomize example labeled "Change only the image name" also set `newTag`, which changed both the name and tag. Removed the `newTag` from that example so it matches the description.
- Digest examples used shortened placeholder digests with ellipses. Replaced them with digest-shaped SHA-256 values so the examples show the correct format.
- The Argo CD Image Updater section said Image Updater always modifies the Application `kustomize.images` field. Updated the wording to reflect the documented default Argo CD API write-back behavior and the alternative Git write-back mode.
- The Image Updater Application snippet omitted required Application fields such as `project`, `repoURL`, `targetRevision`, and `destination`. Added those fields so the example is a complete Application manifest.

## Review Notes
The core guidance is technically sound: Kustomize supports `images` entries with `name`, `newName`, `newTag`, and `digest`; Argo CD supports `spec.source.kustomize.images`; `argocd app set --kustomize-image` and `argocd app manifests --source live` are valid CLI forms. Argo CD Image Updater has newer CR-based configuration in current stable documentation, while the annotation-based examples remain documented in the 0.x release documentation used by many installations.
