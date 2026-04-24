# Validation Summary: How to Browse Volume Contents in Portainer (Swarm/Agent) - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker volumes
- Docker CLI
- Bash

## Sources Consulted
- Portainer docs, Volumes overview: https://docs.portainer.io/user/docker/volumes
- Portainer docs, Browse a volume: https://docs.portainer.io/user/docker/volumes/browse
- Docker docs, Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker docs, `docker volume inspect`: https://docs.docker.com/reference/cli/docker/volume/inspect/
- Docker docs, `docker container run`: https://docs.docker.com/reference/cli/docker/container/run

## Issues Found
- The introduction incorrectly framed the volume browser as a Portainer Business Edition feature. Official Portainer docs document volume browsing for environments running Docker Swarm or the Portainer Agent, so the intro was corrected to match that scope.
- The UI steps for opening the browser were slightly off. The post said to open the volume and then click a Browse button; the official docs describe using **Browse** next to the volume from the **Volumes** list, so the instructions were updated.
- The post claimed Portainer displays file contents in an inline viewer. The official Portainer documentation for volume browsing documents upload, download, rename, and delete actions, but does not document inline file viewing. This section was corrected to use download-based inspection and to point readers to the container console alternative already present in the post.
- The download/upload steps mentioned unsupported UI interactions (`right-click` to download and drag-and-drop upload). These were changed to the documented **Download** action and upload icon flow.
- The Bash helper script used `local` outside of a shell function, which is a Bash error. The variable assignments were fixed and shell quoting was tightened for path handling.
- The host-access section used a `jq`-based `docker volume inspect` example and implied that membership in the `docker` group is sufficient for filesystem access. It was updated to the documented `docker volume inspect --format '{{ .Mountpoint }}'` form and clarified that direct path access depends on host filesystem permissions, typically root. The scope was also narrowed to local-driver volumes on Linux hosts.

## Review Notes
- The direct host path example is Linux- and local-driver-specific. Docker Desktop and non-local volume drivers can expose volume data differently.
- The Docker CLI examples remain valid. While Docker generally recommends `--mount` for more explicit volume syntax, the `-v` form used in this post is still supported and correct for the examples shown.
