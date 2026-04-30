# Validation Summary: How to Set Up Fleet with OCI Registries

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Helm
- OCI registries
- Amazon ECR
- Harbor
- GitHub Actions

## Sources Consulted
- Fleet HelmOps docs: https://fleet.rancher.io/how-tos-for-users/helm-ops
- Fleet OCI Storage docs: https://fleet.rancher.io/0.13/how-tos-for-users/oci-storage
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet source for `GitRepoSpec`: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source for `HelmOpSpec`: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/helmop_types.go
- Helm OCI registry docs: https://helm.sh/docs/topics/registries/
- Helm installation docs: https://helm.sh/docs/intro/install/
- AWS CLI `ecr get-login-password` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Harbor robot account docs: https://goharbor.io/docs/2.12.0/administration/robot-accounts/

## Issues Found
- The post incorrectly stated that Fleet can use `GitRepo.spec.repo: oci://...` as a direct source for raw manifests, Kustomize overlays, and `fleet.yaml` bundles. I changed the post to reflect the documented model: use `HelmOp` for OCI-hosted Helm charts, and use `ociRegistrySecret` only for GitRepo bundle storage.
- The ORAS section implied that pushing raw manifest directories as OCI artifacts is a supported Fleet source workflow. I replaced that with Fleet's documented OCI storage configuration, where Fleet itself uploads bundle content after an OCI storage secret is configured.
- The original `GitRepo` examples used invalid OCI-specific fields and auth flow for direct registry consumption (`repo: oci://...`, `revision`, `clientSecretName`). I replaced them with a valid `GitRepo` example for OCI storage and a separate valid `HelmOp` example for OCI-hosted Helm charts.
- The authentication examples used `docker-registry` secrets and `clientSecretName`, which do not match Fleet's documented Helm registry authentication path. I replaced them with `generic` secrets containing `username` and `password`, referenced through `helmSecretName`.
- The "GitRepo Using OCI with Helm Charts" example placed Helm values under `targets`, which is not valid for `GitRepo` targets. I replaced that example with a valid `HelmOp` resource using `spec.helm.values`.
- The CI/CD workflow used invalid `oras push` usage for the described Fleet workflow and patched a `GitRepo` revision for an unsupported OCI source pattern. I replaced it with a `helm package` plus `helm push` workflow and documented Fleet's polling-based HelmOp update behavior.
- The monitoring section relied on inspecting `GitRepo.spec.revision` for OCI artifact versions. I updated it to monitor `HelmOp` status and resolved chart version, and to monitor `GitRepo` separately when OCI storage is in use.

## Review Notes
- Fleet's documentation is slightly inconsistent around OCI storage fields: the OCI storage how-to and current source code use `spec.ociRegistrySecret`, while some generated reference output still shows older OCI registry schema details. The post was corrected to match the current source and how-to documentation.
- Automatic OCI update detection in Fleet applies to `HelmOp` resources when `pollingInterval` is non-zero and `helm.version` is a semantic version constraint. Static versions do not auto-advance.
- OCI-hosted Helm charts are downloaded by downstream clusters, so registry connectivity is required from those clusters, not just from the Fleet manager.
