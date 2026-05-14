# Validation Summary: How to Set Up Image Automation with GitHub Actions and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image-reflector-controller
- Flux CD image-automation-controller
- Flux ImageRepository, ImagePolicy, ImageUpdateAutomation, and Receiver CRDs
- GitHub Actions
- GitHub Container Registry
- Docker build, login, and metadata GitHub Actions
- Kubernetes Deployment manifests and image pull secrets

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- GitHub Actions Docker image publishing documentation: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker metadata-action documentation: https://github.com/docker/metadata-action
- Kubernetes kubectl docker-registry secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The prerequisite listed Flux CD v2.0 or later, but the examples use the current `image.toolkit.fluxcd.io/v1` image APIs. Older Flux releases used beta API versions, so the prerequisite was updated to Flux CD v2.8 or later.
- The GitHub Actions snippets used older action major versions. They were updated to current major versions shown by official documentation: `actions/checkout@v6`, `docker/login-action@v4`, `docker/metadata-action@v6`, and `docker/build-push-action@v7`.
- The ImageUpdateAutomation `messageTemplate` ranged over `.Changed.Objects` as if each ranged value contained both resource metadata and old/new values. Flux exposes `.Changed.Objects` as object identifiers mapped to lists of changes, so the template was corrected to range over resources and then over each change.
- The direct webhook curl example used a named `/hook/image-reflector` path and bearer token header. Flux Receivers expose a generated `.status.webhookPath`, and the documented Receiver types have type-specific validation. The example was corrected to call the generated path, and the surrounding text now makes clear this applies to an exposed generic Receiver.
- The GitHub Receiver example did not specify GitHub package events for image repository reconciliation. It now includes `ping` and `package` events, matching Flux's guidance for GitHub package webhooks that trigger ImageRepository reconciliation.

## Review Notes
- The GHCR secret command, ImageRepository, ImagePolicy, build-number filter, setter comment, and ImageUpdateAutomation structure are otherwise consistent with current Flux and Kubernetes documentation.
- The GitHub Actions workflow still uses mutable major-version action references for readability. GitHub recommends pinning actions to full commit SHAs for stronger supply-chain security.
