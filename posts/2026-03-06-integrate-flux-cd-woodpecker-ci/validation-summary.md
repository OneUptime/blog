# Validation Summary: How to Integrate Flux CD with Woodpecker CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Woodpecker CI
- Kubernetes
- GitOps
- Docker Buildx / container image registries
- Flux Image Automation
- Flux Notification Controller
- kubectl, flux CLI, Woodpecker CLI

## Sources Consulted
- Woodpecker CI workflow syntax: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker CI environment variables and string substitution: https://woodpecker-ci.org/docs/usage/environment
- Woodpecker CI secrets: https://woodpecker-ci.org/docs/next/usage/secrets
- Woodpecker CI CLI reference: https://woodpecker-ci.org/docs/cli
- Woodpecker CI Docker Buildx plugin: https://woodpecker-ci.org/plugins/docker-buildx
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/flux/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

## Issues Found
- The Woodpecker pipeline used the removed step-level `secrets` syntax. Replaced it with `environment` and `from_secret`, which is the current Woodpecker 3.x pattern.
- The Woodpecker secret CLI examples used the old top-level `woodpecker-cli secret add --repository` form. Updated them to `woodpecker-cli repo secret add --repository`, matching the current CLI documentation.
- The Woodpecker build status command used `woodpecker-cli build ls`, which is outdated. Updated it to `woodpecker-cli pipeline ls myorg/myapp`.
- The GitHub HTTPS clone examples placed the token directly in the username position. Updated them to use the `x-access-token:<token>` credential form for token-based GitHub HTTPS authentication.
- The Flux Image Automation example lacked the required image policy setter comment on the manifest image field. Added the `# {"$imagepolicy": "flux-system:myapp"}` marker and preserved it in the manifest update command.
- The Flux Image Automation commit template referenced `{{.NewImage}}`, which is not part of the current documented template data. Replaced it with a template using `.Changed.Changes`.
- The image automation policy used alphabetical ordering over commit SHA tags, which does not reliably select the newest pushed image and would also compete with the `latest` tag. Added a sortable `build-${CI_PIPELINE_NUMBER}` tag and changed the ImagePolicy to filter those tags and use a numerical policy.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, but the current documented Provider and Alert examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated both snippets.
- The notification section pointed Flux events at a Woodpecker hook URL, but Woodpecker's hook endpoint is for forge webhooks, not generic Flux deployment events. Changed the example to use a generic deployment webhook endpoint.

## Review Notes
- The Flux GitRepository, Kustomization, ImageRepository, ImagePolicy, and ImageUpdateAutomation API groups used in the post are current in the official Flux documentation.
- The Docker Buildx plugin settings used in the Woodpecker pipeline match the official plugin documentation.
- The Kubernetes Deployment, Service, and Namespace manifests are syntactically valid for the stated Kubernetes version range.
