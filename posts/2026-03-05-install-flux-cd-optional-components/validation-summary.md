# Validation Summary: How to Install Flux CD Optional Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes manifests
- Flux image-reflector-controller
- Flux image-automation-controller
- Flux notification-controller
- GitHub bootstrap with deploy keys
- Slack notifications
- Webhook receivers

## Sources Consulted
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux CLI `flux install` reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux bootstrap github` reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/

## Issues Found
- The introduction said the guide covered the S3-compatible bucket source, but the post did not include a bucket source section and bucket sources are handled by the source-controller rather than the image automation optional components. Removed that claim from the introduction.
- The `flux bootstrap github` image automation example omitted `--read-write-key`. Flux image automation needs write access when using GitHub deploy keys so it can push image update commits. Added `--read-write-key` to the bootstrap command.
- The Deployment example was missing the required `spec.selector` field for `apps/v1` Deployments and matching pod template labels. Added a selector and matching labels.
- The Slack `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but Flux's current v1 notification API only covers `Receiver`; `Provider` and `Alert` remain documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated both examples to `v1beta3`.
- The existing-installation section did not mention the write-access requirement for GitHub deploy-key bootstrap setups. Added a short note to include `--read-write-key` when rerunning bootstrap for image automation.

## Review Notes
The remaining Flux CLI commands, image automation resource API versions, ImageRepository and ImagePolicy fields, Receiver example, and webhook token secret format matched the current official Flux documentation. The Slack example uses the legacy incoming webhook style, which is still documented, though Flux currently recommends Slack Bot App tokens for new Slack integrations.
