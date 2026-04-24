# Validation Summary: How to View Running Processes Inside a Container in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose
- Linux process inspection (`ps`, `top`, `/proc`, `strace`)
- Bash

## Sources Consulted
- Portainer Docs, "View a container's details": https://docs.portainer.io/user/docker/containers/view
- Portainer Docs, "View container statistics": https://docs.portainer.io/user/docker/containers/stats
- Portainer source, stats view template: https://github.com/portainer/portainer/blob/develop/app/docker/views/containers/stats/containerstats.html
- Portainer source, Docker top query: https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/queries/useContainerTop.ts
- Docker Docs, `docker container top`: https://docs.docker.com/reference/cli/docker/container/top/
- Docker Engine API spec, `GET /containers/{id}/top`: https://docs.docker.com/reference/api/engine/version/v1.47.yaml
- Docker Docs, `docker container run` (`--init`, `--pid`, `SYS_PTRACE`, `seccomp=unconfined` examples): https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs, Compose file `services.init`: https://docs.docker.com/reference/compose-file/services/#init
- Docker Docs, seccomp security profiles: https://docs.docker.com/engine/security/seccomp/

## Issues Found
- The post said Portainer exposes a `Top` button/tab on the container details page. I changed this to the documented `Stats` view, which is where Portainer shows the process list.
- The process-list explanation described a `ps aux`-style table and said the PID was the process ID inside the container. I corrected this to match Docker's documented `top` behavior and Portainer's raw `/containers/{id}/top` usage, including the default-style columns and PID wording.
- The high-CPU investigation flow implied you could copy a PID from Portainer/Docker `top` and inspect `/proc/<pid>` from inside the container. I changed the workflow so readers first identify the PID from inside the container with `ps`/`top`, then use that in-container PID for `/proc`.
- The `strace` example lacked the security caveat. I added that `strace` must be installed and ptrace must be permitted by the container's security settings.
- The audit script used `docker top --format "{{.Command}}"`, which is not documented for `docker top`. I replaced it with a documented `docker top "$container" aux` invocation.
- The zombie-process example depended on a `STATUS` column that Portainer/Docker's default process view does not necessarily show. I changed the example to a `<defunct>` entry and clarified that `Z` applies when the underlying `ps` format includes a status column.
- The troubleshooting section claimed minimal/distroless images can cause "very minimal process tables". I removed that unsupported explanation and replaced it with cases supported by Docker docs and API behavior: stopped containers, host PID namespace, and Windows not supporting the container `top` endpoint.

## Review Notes
- Docker CLI was not installed in this workspace, so CLI behavior was validated against official Docker documentation and the Docker Engine API specification rather than local `docker --help` output.
- The Compose `init: true` example and the `tini` guidance remain technically valid after review.
