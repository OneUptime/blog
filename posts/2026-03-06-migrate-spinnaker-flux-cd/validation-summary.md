# Validation Summary: How to Migrate from Spinnaker to Flux CD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Spinnaker
- Kubernetes
- Kustomize
- Helm
- GitOps workflows
- Flux image automation
- Flux notification controller
- GitHub CODEOWNERS and pull request approval workflows

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI documentation for bootstrap and suspend/resume commands: https://fluxcd.io/flux/cmd/
- Spinnaker Gate API documentation: https://spinnaker.io/docs/reference/api/docs.html
- Spinnaker spin CLI pipeline management documentation: https://spinnaker.io/docs/guides/spin/pipeline/

## Issues Found
- The Flux bootstrap example installed image automation later with `flux install`, which is not the recommended GitOps bootstrap flow and did not grant write access for image automation commits. Updated the bootstrap command to include `--components-extra=image-reflector-controller,image-automation-controller` and `--read-write-key`.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, but the current documented notification API version is `notification.toolkit.fluxcd.io/v1beta3`. Updated Provider and Alert manifests.
- The Alert example used `spec.summary`, which is deprecated in current Flux Alert documentation. Replaced it with `spec.eventMetadata.summary`.
- The Alert example watched `HelmRelease` resources without specifying a namespace, which would default to the Alert namespace (`flux-system`) rather than the example HelmRelease namespace (`default`). Added `namespace: default` for the HelmRelease event source.
- The Spinnaker pipeline-disable example used an incorrect `PUT /pipelines/my-app/deploy-pipeline` request with a partial body. Replaced it with a flow that fetches the pipeline config, sets `disabled` to `true`, and saves the full pipeline definition through `POST /pipelines`.

## Review Notes
The remaining examples use current Flux API groups for GitRepository, Kustomization, ImageRepository, ImagePolicy, ImageUpdateAutomation, and HelmRelease. The post remains a high-level migration guide; production migrations should still validate repository permissions, secret formats, Flux component versions, and Spinnaker pipeline schema details in the target environment.
