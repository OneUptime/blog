# Validation Summary: Flux CD vs ArgoCD: Image Automation Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD image-reflector-controller
- Flux CD image-automation-controller
- Flux CD ImageRepository, ImagePolicy, and ImageUpdateAutomation CRDs
- Argo CD
- Argo CD Image Updater
- Kubernetes manifests and Secrets
- Container registries including Docker Hub, GHCR, ECR, GCR, and ACR
- Git write-back and GitOps workflows

## Sources Consulted
- Flux Image Update Automations: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image Policies: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image Repositories: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Argo CD Image Updater overview: https://argocd-image-updater.readthedocs.io/en/stable/
- Argo CD Image Updater installation: https://argocd-image-updater.readthedocs.io/en/stable/install/installation/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/stable/basics/update-methods/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/stable/basics/update-strategies/
- Argo CD Image Updater registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/

## Issues Found
- Argo CD Image Updater configuration was described as primarily annotation-based. Current v1.x releases use `ImageUpdater` custom resources, with annotations treated as legacy v0.x configuration. Updated the architecture text, feature table, setup example, filter example, write-back example, and selection guidance to use the current CRD-based configuration.
- The Argo CD Image Updater install URL used the legacy `stable/manifests/install.yaml` path. Updated it to the current documented `stable/config/install.yaml` path.
- The Flux image automation marker was shown on its own comment line above the image. Flux setters must be comments at the end of the field line being updated. Moved the marker onto the `image:` line.
- The Flux alphabetical policy example said to sort in descending order while using `order: asc`. Flux selects the last tag after sorting, and `asc` is the documented default. Updated the comment to match the configuration.
- The Argo CD Image Updater filtering example used legacy annotation keys and a raw regex-style `tag-match` pattern. Updated it to current `commonUpdateSettings.allowTags`, `ignoreTags`, and `updateStrategy` fields in an `ImageUpdater` resource.

## Review Notes
Argo CD Image Updater is under active development and had a major configuration transition in v1.0. Future reviews should re-check the v1.x CRD schema and migration notes before publication.
