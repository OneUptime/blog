# Validation Summary: How to Set Up Image Automation with GitLab CI and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Flux ImageRepository, ImagePolicy, ImageUpdateAutomation, and Receiver resources
- GitLab CI/CD
- GitLab Container Registry
- Kubernetes Secrets and Deployments
- Docker-in-Docker image builds

## Sources Consulted
- Flux Image Update Automations documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image Policies documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux CLI `get images repository` documentation: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- GitLab Container Registry authentication documentation: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab build and push container images documentation: https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab deploy tokens documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab webhook events documentation: https://docs.gitlab.com/user/project/integrations/webhook_events/
- GitLab webhooks documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab protected branch permissions documentation: https://docs.gitlab.com/user/project/repository/branches/protection_rules/

## Issues Found
- The GitLab CI examples used `docker login -p`, while GitLab's current documentation recommends `--password-stdin` for registry authentication. Updated all three login examples to pipe `$CI_REGISTRY_PASSWORD` into `docker login --password-stdin`.
- The Receiver manifest referenced a `webhook-token` Secret without showing how to create it. Added a short command to generate a token and create the Kubernetes Secret with the required `token` key.
- The webhook section said GitLab could notify Flux immediately when a new image is pushed, but GitLab project webhooks are event based, such as pipeline and tag push events. Updated the wording and Receiver event filters to use `Pipeline Hook` and `Tag Push Hook`.
- The command for `.status.webhookPath` was described as returning the webhook URL, but Flux exposes only the generated path in that field. Updated the text and command comment to say it returns the receiver path and must be combined with the public URL for the Flux `webhook-receiver` service.

## Review Notes
- The Flux image automation API snippets use current `image.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io/v1`, and `notification.toolkit.fluxcd.io/v1` examples and match the documented fields reviewed.
- The Docker-in-Docker examples are intentionally minimal. GitLab's current Docker documentation recommends pinning exact Docker image versions and configuring runners for privileged Docker-in-Docker with TLS when applicable.
