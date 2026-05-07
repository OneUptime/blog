# Validation Summary: How to Automate Docker Image Builds and Deployments with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Buildx / BuildKit
- CNCF Distribution registry
- Portainer API
- Watchtower
- Trivy
- Makefile / GNU Make
- Bash

## Sources Consulted
- Docker Build Overview: https://docs.docker.com/build/concepts/overview/
- Docker Buildx create: https://docs.docker.com/reference/cli/docker/buildx/create/
- Docker Buildx build: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Docker Compose version and name: https://docs.docker.com/reference/compose-file/version-and-name/
- CNCF Distribution registry configuration: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution pull-through cache recipe: https://distribution.github.io/distribution/recipes/mirror/
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer stack webhooks docs: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer CE OpenAPI stack endpoints and schemas: https://api-docs.portainer.io/versions/ce/2.39.2/stacks.yaml
- Watchtower arguments: https://raw.githubusercontent.com/containrrr/watchtower/main/docs/arguments.md
- Watchtower HTTP API mode: https://raw.githubusercontent.com/containrrr/watchtower/main/docs/http-api-mode.md
- Watchtower notifications: https://raw.githubusercontent.com/containrrr/watchtower/main/docs/notifications.md
- Trivy image CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Trivy vulnerability scanner docs: https://trivy.dev/docs/dev/guide/scanner/vulnerability/
- Watchtower repository status: https://github.com/containrrr/watchtower

## Issues Found
- The registry example enabled `REGISTRY_PROXY_REMOTEURL`, which turns the registry into a pull-through cache. Official Distribution docs state that pushing to a pull-through cache is unsupported, so that setting was removed.
- The Portainer update example used an invalid update payload for current Portainer API behavior. It omitted `StackFileContent`, hardcoded `endpointId=1`, used deprecated `PullImage` semantics, and would overwrite stack environment variables. The script was updated to fetch the stack metadata and file content first, preserve existing env vars, derive the correct `EndpointId`, and use `RepullImageAndRedeploy`.
- The Watchtower example used an incorrect schedule and HTTP API combination. Watchtower uses a 6-field cron expression, and enabling HTTP API mode disables periodic polls unless `WATCHTOWER_HTTP_API_PERIODIC_POLLS` is also enabled. The compose example was corrected accordingly.
- The Watchtower “specific container” HTTP call was incorrect. Official docs expose `/v1/update` and support filtering by image via the `image` query parameter, so the example was updated.
- The Watchtower scope label comment was incorrect and incomplete. The label is for scoping a container to a specific Watchtower instance, so the example now includes the matching `WATCHTOWER_SCOPE` setting and corrected commentary.
- The multi-architecture builder example was too weak for broad multi-platform use. It was updated to create a `docker-container` builder with `--bootstrap`, matching current Docker guidance for multi-platform builds.
- The Makefile duplicated work by making `deploy` depend on `push` even though `build-and-deploy.sh` already builds and pushes. The target was corrected, `all` was simplified to avoid duplicate work, and `.PHONY` was updated.
- The Compose snippets used the top-level `version` field, which current Docker Compose docs mark as obsolete. The field was removed.
- The build script path comment did not match the Makefile example. The script comment was aligned with the local `./build-and-deploy.sh` usage shown later in the post.

## Review Notes
- Watchtower’s official GitHub repository was archived on December 17, 2025. The examples in the post are still technically valid, but this is an important maintenance caveat for new production use.
- Portainer stack webhooks are documented as a Business Edition feature. This post now accurately demonstrates the Portainer API-based path instead of implying a webhook-based Portainer deployment flow.
- The corrected Portainer script targets file-based stacks. Git-backed stacks use different Portainer update and redeploy endpoints.
