# Validation Summary: How to Implement Developer Self-Service Deployments with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- GitOps
- Flux image-reflector-controller
- Flux image-automation-controller
- Flux `ImageRepository`, `ImagePolicy`, and `ImageUpdateAutomation` APIs
- Container registries
- GitHub bootstrap and branch-based image update workflows

## Sources Consulted
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux sortable image tags guide: https://fluxcd.io/flux/guides/sortable-image-tags/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux `flux bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `flux get images policy` CLI reference: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The `ImageUpdateAutomation` commit template used `.Updated.Images`, which has been removed from the Flux image automation API and causes the automation to become stalled. Updated it to use `.Changed.Changes`.
- The image policy marker was placed on a separate comment line before the image field. Flux setters must be inline on the target YAML field, so the marker was moved to the end of the `image:` line.
- The prerequisites did not state that the application `GitRepository` source needs write credentials for Flux to push image update commits. Added that requirement.
- The bootstrap command did not show write access for GitHub deploy-key based image update workflows. Added `--read-write-key`, matching Flux's image update guide.
- The branch protection best practice implied Flux should commit directly to a protected `main` branch with required checks. Updated it to recommend pushing to a separate branch and opening a pull request.
- The commit signing note referred to SSH key automation support. Flux's documented commit signing support for `ImageUpdateAutomation` uses a PGP signing key, so the note was corrected.
- The developer status section said "without kubectl cluster access" even though the Flux CLI still uses Kubernetes API credentials. Reworded it to "without broad kubectl cluster access" with a scoped kubeconfig.

## Review Notes
The Flux image APIs and CLI commands used in the post are current for Flux v2 as of the reviewed documentation. The date-based tag policy follows Flux's sortable image tag guidance by extracting a timestamp and using numerical ascending order.
