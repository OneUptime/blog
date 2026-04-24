# Validation Summary: How to Create Named Volumes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker volumes
- Docker Compose
- Shell scripting

## Sources Consulted
- Docker Engine volume documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Compose file reference, `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volume reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker CLI reference for `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker CLI reference for `docker volume ls`: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker CLI reference for `docker volume inspect`: https://docs.docker.com/reference/cli/docker/volume/inspect/
- Portainer volume overview: https://docs.portainer.io/user/docker/volumes
- Portainer volume creation guide: https://docs.portainer.io/user/docker/volumes/add
- Portainer volume browsing guide: https://docs.portainer.io/user/docker/volumes/browse
- Portainer attach-volume guide: https://docs.portainer.io/sts/user/docker/containers/attach-volume

## Issues Found
- The Compose example used the top-level `version: "3.8"` key. Docker now documents this field as obsolete in the Compose Specification, so it was removed.
- The Linux storage path for named volumes was stated as a universal location. This was narrowed to “by default” because Docker’s data root can be configured differently.
- The `local` driver bind-style example used a generic host path and implied regular named-volume portability. It was clarified to use an absolute host path and to explain that this behaves more like a bind mount and is less portable than a regular named volume.
- The “best practices” Compose example recommended manually prefixing volume names with the stack name. Compose already prefixes actual volume names with the project name by default, so the example was corrected to use meaningful unprefixed logical names instead.
- The external-volume pre-population command copied from `/templates/*` inside `alpine`, which would fail because that path is not present in the example container. It was replaced with a working command that writes sample configuration data into the volume.

## Review Notes
- The post is technically sound after the above corrections and aligns with current Docker and Portainer documentation as of 2026-04-24.
- Portainer’s direct volume-browsing UI is only available when the environment uses Docker Swarm or the Portainer Agent; the post already states this correctly.
- The review environment did not have the Docker CLI installed, so CLI verification was performed against Docker’s official command reference rather than local `docker --help` output.
