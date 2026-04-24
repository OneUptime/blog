# Validation Summary: How to Install Portainer Using Docker Run Command - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Docker Engine
- Docker CLI (`docker run`, `docker logs`, `docker inspect`, `docker stats`, `docker restart`)
- Bash shell command syntax

## Sources Consulted
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer CE STS install docs for Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer custom SSL certificate docs: https://docs.portainer.io/advanced/ssl
- Portainer FAQ on re-enabling HTTP access: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Engine docs on running containers and resource constraints: https://docs.docker.com/engine/containers/run/
- Docker JSON file logging driver docs: https://docs.docker.com/engine/logging/drivers/json-file/
- Official Docker Hub tags for `portainer/portainer-ce`: https://hub.docker.com/r/portainer/portainer-ce/tags/

## Issues Found
- Several multiline `docker run` examples placed inline comments after a line-continuation backslash. That makes the copied commands unreliable in shell usage. I moved the comments so the commands remain valid when copied.
- The `8000` port was described as a generic Portainer agent port. Portainer’s install docs describe `8000` as the optional TCP tunnel port used for Edge Agent / Edge compute features, so I corrected that wording.
- The HTTP-only example used `--http-enabled` but did not disable the HTTPS listener. I added `--bind-https ""` so the example matches the section’s stated behavior.
- The pinned-version example used `portainer/portainer-ce:2.20.2`, which is outdated as of April 24, 2026. I updated it to the currently published `2.40.0` tag from the official Docker Hub repository.

## Review Notes
- The remaining `:latest` examples are technically valid because the official Docker Hub repository still publishes a `latest` tag, but Portainer’s install docs currently show `:lts` in LTS documentation and `:sts` in STS documentation. For production-facing content, a fixed version or the documented support-channel tag is more predictable.
- Portainer’s current install docs note that exposing port `9000` is only needed for legacy HTTP access.
