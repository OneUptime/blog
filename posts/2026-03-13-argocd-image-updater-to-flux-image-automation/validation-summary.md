# Validation Summary: How to Migrate ArgoCD Image Updater to Flux Image Automation

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD Image Automation Controller
- Flux ImageRepository, ImagePolicy, and ImageUpdateAutomation CRDs
- Flux CLI image automation status commands
- Argo CD Image Updater annotations
- Kubernetes Deployment manifests
- Kubernetes Docker registry Secrets
- Kustomize image fields
- GitOps repository image update workflows

## Sources Consulted
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI `flux get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI `flux get images update` documentation: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Argo CD Image Updater image configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Deployment image marker example placed `containers` directly under `spec`, which is not the correct path for a Kubernetes Deployment. Updated it to `spec.template.spec.containers` so the Flux marker appears on the actual pod template image field.
- The secret copy command rewrote only the namespace of an exported Secret YAML. That can carry server-managed metadata such as `resourceVersion`, `uid`, and timestamps into a new namespace. Replaced it with a `kubectl create secret generic` command that copies only the `.dockerconfigjson` data and sets the correct Docker config secret type.
- The command for disabling Argo CD Image Updater removed only part of the annotations shown earlier in the tutorial. Added removal of `myapp.allow-tags`, `myapp.pull-secret`, and `git-branch` so the migrated Application no longer retains stale image updater configuration.

## Review Notes
The Flux CRDs use the current `image.toolkit.fluxcd.io/v1` API and the documented `Setters` update strategy. The Flux image policy marker examples match the official marker formats. The local environment did not have the `flux` CLI installed, so CLI command validation was performed against the official Flux CLI reference rather than local `--help` output.
