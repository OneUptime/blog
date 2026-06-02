# Validation Summary: How to Set Up Flux for GitOps on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EKS
- Kubernetes
- Flux CD v2
- Flux CLI
- Kustomize
- Helm and HelmRelease
- Flux image automation
- Flux notifications
- GitHub GitOps repositories

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux optional components: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux create secret git command reference: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Kustomize overlay used `patchesStrategicMerge`, which is deprecated in current Kustomize usage. Changed it to the current `patches` field with `path: replica-patch.yaml`.
- The base Kustomization referenced `service.yaml`, but the post did not include that file. Added a minimal valid Service manifest matching the Deployment labels and container port.
- The image automation section implied `ImageRepository`, `ImagePolicy`, and the marker comment were enough to commit image updates to Git. Added the required `--components-extra=image-reflector-controller,image-automation-controller` bootstrap flag, `--read-write-key` for Git push access, and an `ImageUpdateAutomation` manifest.
- The ECR ImageRepository example omitted the AWS registry provider. Added `provider: aws`, which is the Flux-supported provider for ECR authentication via node IAM or IRSA.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for `Alert` and `Provider`, while current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.

## Review Notes
The post remains focused on a GitHub bootstrap flow even though the prerequisites mention GitLab tokens. That is acceptable because the command examples are explicitly GitHub-based. For private ECR repositories, readers still need to grant ECR read access to the Flux image reflector controller through node IAM or IRSA.
