# Validation Summary: How to Fix Docker Healthcheck Not Displaying in Portainer

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Docker
- Docker Compose
- Docker HEALTHCHECK
- Portainer

## Sources Consulted
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose `services.healthcheck` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI `docker container exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Portainer general settings (`Snapshot interval`): https://docs.portainer.io/admin/settings/general
- Portainer CLI configuration options (`--snapshot-interval`): https://docs.portainer.io/advanced/cli
- Portainer CE install command for Docker Standalone: https://docs.portainer.io/start/install-ce/server/docker/linux

## Issues Found
- The post said Portainer polls container status every 60 seconds. Portainer's official documentation says the environment snapshot interval defaults to 5 minutes, so I corrected the explanation to match the documented behavior.
- The `docker run ... portainer/portainer-ce:latest --snapshot-interval 30` example was not a runnable command and used an invalid interval format for Portainer. I replaced it with a complete `docker run` example using the documented `--snapshot-interval 30s` format.
- The Step 1 inspection example was described as checking whether the image had a healthcheck, but the command inspects the container's effective configuration. I corrected the wording to say the container has no healthcheck configured when the result is `null`.
- The Compose example used a top-level `version: "3.8"` key. Docker documents the top-level `version` property as obsolete, so I removed it from the snippet.
- The debugging section did not state that healthcheck commands run inside the container. I added that clarification because tools such as `wget`, `curl`, `nc`, and `pgrep` must exist in the image for those checks to work.

## Review Notes
The common healthcheck patterns shown in the post are valid, but each one depends on the referenced binary being present inside the container image.
