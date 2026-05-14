# Validation Summary: How to Integrate Flux CD with GitHub Actions for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux OCIRepository, Kustomization, Receiver, Provider, and Alert resources
- GitHub Actions
- GitHub Container Registry
- Docker GitHub Actions
- Kubernetes
- Kustomize
- GitHub webhooks

## Sources Consulted
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux `push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `tag artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux `events` CLI documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux `get receivers` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_receivers/
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- GitHub Actions setup-node documentation: https://github.com/actions/setup-node
- Docker login-action documentation: https://github.com/docker/login-action
- Docker metadata-action documentation: https://github.com/docker/metadata-action
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Issues Found
- The GitHub Actions examples used older major versions for several maintained actions. Updated `actions/checkout` from v4 to v5, `actions/setup-node` from v4 to v6, `docker/login-action` from v3 to v4, `docker/metadata-action` from v5 to v6, and `docker/build-push-action` from v5 to v7 to match current upstream releases.
- The `flux push artifact --revision` value used `branch/commit`, but Flux documents the required format as `<branch|tag>@sha1:<commit-sha>`. Updated the workflow and troubleshooting example to use `$(git branch --show-current)@sha1:$(git rev-parse HEAD)`.
- The GitHub notification `Provider` and `Alert` snippets used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation exposes Provider and Alert examples under `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.

## Review Notes
- The `OCIRepository` example references a `ghcr-credentials` secret. Flux expects that secret to contain registry credentials in Docker config format when the registry is private.
- The webhook URL must be reachable by GitHub Actions, typically through an ingress or other external exposure of the Flux webhook receiver service.
