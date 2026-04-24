# Validation Summary: How to Manage Dev, Staging, and Production Environments with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- PostgreSQL
- Redis
- Bash

## Sources Consulted
- Portainer Environments documentation: https://docs.portainer.io/admin/environments/environments
- Portainer Add a new environment: https://docs.portainer.io/admin/environments/add
- Portainer Add a new stack: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Webhooks: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer automatic updates for stacks/applications: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer environment variable management (`.env` vs `stack.env`): https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer known issue for Compose `build` directives on remote environments: https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Docker Compose merge/override files: https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Compose production guidance: https://docs.docker.com/compose/how-tos/production/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker image inspect: https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker image pull: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker image tag: https://docs.docker.com/reference/cli/docker/image/tag/

## Issues Found
- The base Compose example used the top-level `version: "3.8"` field, which Docker now documents as obsolete. I removed it so the snippet matches current Compose guidance.
- The post referred to "network namespaces" for single-instance Portainer separation. I changed this to "networks", which is the Docker/Compose concept the rest of the post actually uses.
- The development override used `build: .`, but Portainer documents that Compose `build` directives are not supported for remote Docker environments and recommends building outside Portainer, then deploying prebuilt images. I removed the `build` directive and kept the override focused on development-time runtime settings.
- The production override relied on the optional `deploy` section for scaling and memory limits. Because Docker documents `deploy` support as optional and potentially ignored when not implemented, I changed the example to use Compose service attributes (`scale` and `mem_limit`) that better fit Docker Standalone-style Portainer deployments.
- The environment-variable examples omitted `REDIS_URL` even though the base Compose file requires it. I added environment-specific Redis URLs so the configuration is internally consistent.
- The production `.env` example used `IMAGE_TAG=v1.5.0`, while the promotion script retagged images to environment tags like `production`. I changed the production example to `IMAGE_TAG=production` so the environment file matches the promotion workflow shown later in the post.
- The promotion script inspected the image before pulling it locally. Since `docker image inspect` works on local image metadata, I changed the order to pull first, then inspect the digest.
- The promotion script used generic `docker inspect` and stored the result in `CURRENT_TAG`, even though the value is a digest. I updated it to `docker image inspect` and renamed the variable to `CURRENT_DIGEST` for correctness.
- The promotion pipeline implied that Portainer stack webhooks are generally available. Portainer documents that stack webhooks are available only in Business Edition and only on non-Edge environments. I added that scope to the introductory sentence for the section.

## Review Notes
- The post's use of `docker-compose.yml` style filenames is still valid for backward compatibility, but Docker now prefers `compose.yaml`.
- The development bind-mount example (`.:/app`) assumes a deployment method where the application source is available on the Docker host. In Portainer Git-based deployments, relative-path bind mounts have additional constraints and may require Business Edition features such as relative path support.
- Portainer documents that `env_file` does not work for Docker Swarm stacks deployed with `docker stack deploy`; if this post is later expanded toward Swarm-specific production guidance, that distinction should be called out explicitly.
