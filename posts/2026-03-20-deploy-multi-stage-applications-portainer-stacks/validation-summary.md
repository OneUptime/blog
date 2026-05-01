# Validation Summary: How to Deploy Multi-Stage Applications with Portainer Stacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- YAML anchors and aliases
- Docker Compose profiles
- Docker Compose extension fields (`x-` fields)
- PostgreSQL
- Nginx

## Sources Consulted
- Portainer Docs: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs: Docker Compose files including build steps fail — https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
- Docker Docs: Use service profiles — https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs: Extensions — https://docs.docker.com/reference/compose-file/extension/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Control startup and shutdown order in Compose — https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Deploy a stack to a swarm — https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: docker stack deploy — https://docs.docker.com/reference/cli/docker/stack/deploy/

## Issues Found
- The post said Portainer's stack editor supports the full Docker Compose specification. I changed this to scope the behavior to Docker Standalone and noted that Docker Swarm stacks in Portainer use `docker stack deploy`, which relies on the legacy Compose v3 format instead of the full Compose Specification.
- All Compose examples used the top-level `version: "3.8"` field. I removed it because Docker now marks the top-level `version` element as obsolete.
- The profiles example used `profiles: []` to indicate an always-on service. I removed that field because Docker documents that services are always enabled when the `profiles` attribute is omitted.
- The profiles section said to set `COMPOSE_PROFILES` "in Portainer". I rephrased this to describe it as the standard Compose mechanism, which is what the official Docker docs document directly.
- The staged deployment example made `nginx` depend on `app` being `service_healthy`, but the `app` service had no healthcheck. I added an explicit `app` healthcheck and tightened the database healthcheck so the startup-order example is internally consistent and runnable as described.
- The post description mentioned build steps even though the article did not cover them and Portainer documents build limitations for remote Docker environments. I changed the description to refer to initialization, migrations, and serving instead.

## Review Notes
- Portainer documents that remote Docker environments currently do not support Compose `build` steps in stack deployments, so prebuilt images remain the safer pattern there.
- The multi-stage example is appropriate for Docker Standalone deployments. Reusing the same file for Docker Swarm stacks requires separate compatibility review because Swarm uses `docker stack deploy` and not the full Compose Specification.
