# Validation Summary: How to Use Docker Compose Profiles in Portainer

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
- Portainer documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Docker Docs, "Use service profiles": https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Fragments": https://docs.docker.com/reference/compose-file/fragments/
- Docker Docs, "Extensions": https://docs.docker.com/reference/compose-file/extension/
- Docker Docs, "Control startup and shutdown order in Compose": https://docs.docker.com/compose/how-tos/startup-order/
- Portainer official source, Compose project loading: https://github.com/portainer/portainer/blob/develop/pkg/libstack/compose/composeplugin.go
- Portainer official source tests covering `COMPOSE_PROFILES`: https://github.com/portainer/portainer/blob/develop/pkg/libstack/compose/composeplugin_test.go
- Portainer release notes noting a fix for stacks containing Compose profiles: https://github.com/portainer/portainer-docs/blob/2.39/release-notes.md

## Issues Found
- The post said Portainer's stack editor supports the full Docker Compose specification. This was too broad. I corrected the wording to scope profile usage to Docker Standalone stacks and added the Docker Swarm caveat, because Portainer uses `docker stack deploy` for Swarm and Docker documents that `docker stack deploy` only supports the legacy Compose v3 format, not newer Compose-spec features such as profiles.
- The Compose snippets used top-level `version: "3.8"` declarations. I removed them because the current Compose Specification marks the top-level `version` field as obsolete and only retained for backward compatibility.
- The profile example used `profiles: []` with a comment saying that meant "always active". I corrected this by removing the empty `profiles` list and clarifying that services without a `profiles` entry are always enabled, which matches Docker's current profile behavior.
- The Portainer instructions for activating profiles were underspecified. I clarified that `COMPOSE_PROFILES` should be set as a stack environment variable in Portainer on Docker Standalone. Portainer's official source and tests confirm `COMPOSE_PROFILES` is read from stack environment input.
- The multi-stage example declared `condition: service_healthy` for `nginx` depending on `app`, but `app` had no healthcheck. I changed that dependency to `service_started`, because Docker documents that `service_healthy` requires a healthcheck on the dependency service.

## Review Notes
- Portainer's official end-user docs describe stack environment variables and Swarm limitations, but they do not explicitly document `COMPOSE_PROFILES`. I verified that behavior against Portainer's official source code and tests.
- The YAML anchor and extension field examples are syntactically valid under current Compose documentation.
- The `deploy` section used in the YAML anchor example is valid Compose syntax, but Compose support for `deploy` attributes can still vary by platform and runtime.
