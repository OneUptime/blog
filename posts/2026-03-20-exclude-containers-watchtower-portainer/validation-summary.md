# Validation Summary: How to Exclude Containers from Watchtower in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Watchtower
- Portainer
- Docker
- Docker Compose
- Slack webhook notifications for Watchtower

## Sources Consulted
- Watchtower: Container selection — https://containrrr.dev/watchtower/container-selection/
- Watchtower: Arguments — https://containrrr.dev/watchtower/arguments/
- Watchtower: Running multiple instances — https://containrrr.dev/watchtower/running-multiple-instances/
- Watchtower: Notifications — https://containrrr.dev/watchtower/notifications/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: docker container run — https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: Docker object labels — https://docs.docker.com/engine/manage-resources/labels/
- Portainer Docs: Inspect or edit a stack — https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs: Edit or duplicate a container — https://docs.portainer.io/2.21/user/docker/containers/edit
- Portainer Docs: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced

## Issues Found

1. **The Compose example used the obsolete top-level `version` field.** Docker's current Compose Specification keeps `version` only for backward compatibility and marks it obsolete. Removed `version: '3.8'` from the Compose snippet so the example matches current Docker guidance.

2. **The Portainer stack-edit instructions were too broad.** Portainer documents that Git-backed stacks must be updated from the repository or detached from Git before editing directly in Portainer. Updated the Editor step to reflect that limitation.

3. **The scoped Watchtower example was incomplete and would not work as shown.** A Watchtower container needs the Docker socket mounted to manage local containers, and the official scope documentation says the Watchtower instance itself should carry the matching `com.centurylinklabs.watchtower.scope` label. Added the socket mount and the scope label to the `watchtower-prod` example.

## Review Notes
- The Slack notification example uses Watchtower's legacy notification environment variables. This is still supported and documented for backward compatibility, so it is technically correct. Watchtower also supports the newer `WATCHTOWER_NOTIFICATION_URL` Shoutrrr-based configuration if the post is expanded later.
