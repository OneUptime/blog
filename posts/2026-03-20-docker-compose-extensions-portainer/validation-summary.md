# Validation Summary: How to Use Docker Compose Extensions in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- YAML anchors and aliases
- Compose extension fields (`x-` fields)

## Sources Consulted
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs, Resource limits in a compose file are not applying: https://docs.portainer.io/faqs/known-issues/resource-limits-in-a-compose-file-are-not-applying
- Docker Docs, Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Docs, Extensions: https://docs.docker.com/reference/compose-file/extension/
- Docker Docs, Fragments: https://docs.docker.com/reference/compose-file/fragments/
- Docker Docs, Profiles: https://docs.docker.com/reference/compose-file/profiles/
- Docker Docs, Using profiles with Compose: https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs, Services (`depends_on`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, docker stack deploy: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs, Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/

## Issues Found
- The post claimed Portainer's stack editor supports the full Docker Compose specification. I corrected this to distinguish Docker Standalone from Docker Swarm, because Portainer documents Swarm stack deployment via `docker stack deploy`, which uses the legacy Compose file version 3 format rather than the full modern Compose Specification.
- The profiles section implied Portainer users should set `COMPOSE_PROFILES` in the Portainer stack UI. I replaced that with the official Docker Compose commands and clarified that profiles are a standalone Docker Compose feature. Portainer's stack documentation describes UI environment variables for compose-file interpolation, not a documented profile-selection control.
- The profiles example used `profiles: []` to indicate an always-on service. I removed that line because Docker's profile documentation defines services without a `profiles` entry as always enabled.
- The multi-stage example used `depends_on: condition: service_healthy` for `app` even though `app` had no healthcheck. I changed that dependency to `service_started` and updated the comment so the example matches Docker's `depends_on` rules.

## Review Notes
- Modern Docker Compose treats the top-level `version` field as obsolete, but the examples still use `version: "3.8"`, which remains common in Portainer and Swarm-oriented stack files.
- Compose feature support in Portainer depends on the target environment. Docker Standalone behavior is closer to current Compose documentation, while Docker Swarm stacks inherit `docker stack deploy` limitations.
