# Validation Summary: How to Speed Up Stack Deployments in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- CNCF Distribution / Docker Registry
- Docker registry mirrors
- Dockerfile multi-stage builds

## Sources Consulted
- Portainer FAQ: Why are stack deployment times slow? https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/why-are-stack-deployment-times-slow
- Portainer docs: Pull an image https://docs.portainer.io/user/docker/images/pull
- Portainer FAQ: Docker Compose files including build steps fail https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Portainer docs: Edge Stacks https://docs.portainer.io/user/edge/stacks
- Docker Docs: `docker compose pull` https://docs.docker.com/reference/cli/docker/compose/pull/
- Docker Docs: `docker compose config` https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Docs: `docker compose` CLI reference (`--parallel`) https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: Compose `version` top-level element (obsolete) https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services `pull_policy` https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `dockerd` reference (`insecure-registries`, `registry-mirrors`) https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Docker Hub mirror / pull-through cache https://docs.docker.com/docker-hub/image-library/mirror/
- CNCF Distribution: Configuring a registry https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution: Deploy a registry server https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution: Registry as a pull-through cache https://distribution.github.io/distribution/recipes/mirror/

## Issues Found
- The post originally framed slow Portainer stack deployments as mainly an image-pull problem. Portainer's official docs identify registry access checks and authentication timeouts as a common cause, so the introduction, root-cause list, and timeout section were corrected to reflect that behavior.
- The pre-pull example parsed YAML with `grep` and `awk`, which is brittle and not the current Docker-recommended approach. It was replaced with `docker compose -f "$COMPOSE_FILE" pull`, which matches the official CLI.
- The parallel pull example used `xargs` over parsed YAML. It was replaced with `docker compose --parallel 10 -f docker-compose.yml pull`, which uses Docker Compose's supported parallelism control.
- The registry mirror and private registry examples used `registry:2`; current official registry deployment docs use `registry:3`, so both snippets were updated.
- The private registry Compose snippet mounted `registry_data` without declaring it in a top-level `volumes` section. That declaration was added.
- The local registry example used `localhost:5000` and `latest`, which is a poor fit for Portainer-managed hosts or multi-node deployments and can reduce cache predictability because Compose treats `latest` specially. The example was updated to use a reachable registry hostname and a fixed version tag.
- The multi-stage Dockerfile mixed a full Node base image with an Alpine runtime and used the older `npm ci --only=production` form. The example was updated to a consistent Debian image family and `npm ci --omit=dev`, and the overly specific image-size claim was replaced with a general accurate statement.

## Review Notes
- Portainer has a built-in `Pre-pull images` option for Edge Stacks. For regular Docker or Swarm stack deployments, image availability still depends on the Docker hosts' local cache and registry access.
- Portainer currently documents remote Compose `build` directives as unsupported for remote Docker environments, so pre-building images and pushing them to a registry remains the safer deployment path.
