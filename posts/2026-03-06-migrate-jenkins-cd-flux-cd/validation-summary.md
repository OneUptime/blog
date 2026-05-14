# Validation Summary: How to Migrate from Jenkins CD to Flux CD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Jenkins Pipeline
- Kubernetes
- Helm
- Kustomize
- SOPS
- age
- Slack notifications

## Sources Consulted
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux notifications Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notifications Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI `get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The bootstrap command did not install the optional image automation controllers, but the guide later uses `ImageRepository`, `ImagePolicy`, and `ImageUpdateAutomation`. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The bootstrap command did not grant Git write access, but image automation needs to commit and push image updates. Added `--read-write-key` and removed `--personal` to keep the example consistent with an organization owner placeholder.
- The Jenkins-to-Flux mapping described build triggers as `GitRepository` polling. Flux handles deployment reconciliation, not application builds, so the wording was corrected to deployment triggers.
- The image automation section implied Flux replaces the Jenkins image build behavior. Adjusted the wording to keep image builds in CI while Flux updates deployment tags in Git.
- The image policy marker was placed on the line before the `image:` field. Flux setters are inline YAML comments on the field being updated, so the marker was moved to the `image:` line.
- The notification `Alert` and `Provider` snippets used `notification.toolkit.fluxcd.io/v1`, but current Flux notification `Alert` and `Provider` resources use `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.

## Review Notes
The remaining examples are syntactically aligned with current Flux v2 APIs. The placeholder chart repository, image registry, Slack secret, age recipient, and GitHub owner/repository values must still be replaced with real environment-specific values before use.
