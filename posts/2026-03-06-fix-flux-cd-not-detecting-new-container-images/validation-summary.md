# Validation Summary: How to Fix Flux CD Not Detecting New Container Images

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageRepository
- ImagePolicy
- ImageUpdateAutomation
- Kubernetes Secrets
- kubectl
- AWS ECR authentication
- Container registry tag policies

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux CLI `flux reconcile image repository` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Flux CLI `flux install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux bootstrap` documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Masterminds semver documentation: https://github.com/Masterminds/semver

## Issues Found
- The AWS ECR secret command used `kubectl create secret docker-registry --docker-password-stdin`, but that flag is not part of the official kubectl command. Changed the example to pass the ECR login token through the supported `--docker-password` flag using command substitution.
- The ImagePolicy debugging commands used `.status.latestImage`, but current Flux v1 ImagePolicy status reports the selected image under `.status.latestRef.image` and `.status.latestRef.tag`. Updated both jsonpath examples.
- The semver troubleshooting example said tags like `v1.2.3` would not match a semver policy expecting `1.2.3`. Current Flux semver behavior and its semver dependency support a leading `v` prefix, and the official Flux guide uses `v1.0.1` image tags with semver policy examples. Changed the example to a genuinely non-semver prefix, `release-1.2.3`, and updated the `filterTags` pattern accordingly.

## Review Notes
The remaining Flux CRD examples use current `image.toolkit.fluxcd.io/v1` APIs and match the official Flux image automation documentation. The post could optionally mention webhook receivers for faster registry-triggered scans, but the existing interval and manual reconcile guidance is technically correct.
