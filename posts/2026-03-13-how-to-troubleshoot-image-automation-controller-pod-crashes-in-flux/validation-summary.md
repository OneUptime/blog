# Validation Summary: How to Troubleshoot Image Automation Controller Pod Crashes in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Image Automation Controller
- ImageUpdateAutomation
- kubectl
- Flux CLI
- Git commit signing

## Sources Consulted
- Flux Image Update Automations documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux `flux get images update` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux `flux reconcile image update` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- Flux image automation controller deployment manifest: https://github.com/fluxcd/image-automation-controller/releases/download/v1.1.3/image-automation-controller.deployment.yaml
- Flux image automation controller label transformer: https://raw.githubusercontent.com/fluxcd/flux2/main/manifests/bases/image-automation-controller/labels.yaml

## Issues Found
- The post described Git authentication failures, push conflicts, commit signing issues, and invalid markers as pod crash causes. Flux reports these as ImageUpdateAutomation reconciliation failures rather than normal controller pod crashes, so the wording was changed to distinguish crashes from reconciliation failures.
- The post used `flux get image update --all-namespaces`. Current Flux CLI documentation names the command `flux get images update`, so the command was updated.
- The post suggested using shallow clones for large repositories. Flux already uses shallow clones by default unless `--feature-gates=GitShallowClone=false` is set, so the guidance was corrected.
- The post referred to GPG signing generically. Current Flux documentation describes `.spec.git.commit.signingKey` as a PGP signing key stored in a Kubernetes Secret, so the wording was adjusted.

## Review Notes
The Kubernetes `kubectl` commands, controller deployment name, selector usage, `ImageUpdateAutomation` API version and fields, image policy marker example, and `flux reconcile image update` command are consistent with current Flux and Kubernetes behavior. The memory limit patch assumes the target container and resource path exist in the installed deployment, which is true for current Flux manifests but may need adjustment for heavily customized installations.
