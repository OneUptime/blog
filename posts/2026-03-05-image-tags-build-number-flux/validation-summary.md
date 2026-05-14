# Validation Summary: How to Configure Image Tags with Build Number for Flux Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- GitOps
- Container image tag selection

## Sources Consulted
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI documentation for `flux bootstrap` and `flux install`: https://fluxcd.io/flux/cmd/flux_bootstrap/ and https://fluxcd.io/flux/cmd/flux_install/

## Issues Found
- The ImageRepository example incorrectly used `spec.filterTags`. Current Flux API documentation defines `filterTags` on ImagePolicy, not ImageRepository. Removed the unsupported field from the ImageRepository manifest and adjusted the explanation.
- The GitHub bootstrap command omitted `--read-write-key`. Flux's GitHub bootstrap documentation notes that deploy keys are read-only by default and image automation needs write access to push Git commits. Added `--read-write-key` to the bootstrap command.
- The troubleshooting command comment said `kubectl describe imagerepository` lists all tags. Flux documents this as a way to inspect status and scan results, including latest tags and tag count, not necessarily a full registry tag listing. Updated the comment to say it inspects scan results.

## Review Notes
The ImagePolicy numerical examples, inline image policy marker, ImageUpdateAutomation fields, and `flux install --components-extra=image-reflector-controller,image-automation-controller` usage match current Flux documentation. The local environment did not have the `flux` CLI installed, so CLI verification was performed against official Flux CLI documentation instead of local `--help` output.
