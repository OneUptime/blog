# Validation Summary: How to Upgrade Portainer CE on Docker Standalone - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Portainer Community Edition (CE)
- Docker (standalone host)
- Docker CLI (run, stop, rm, pull, ps, inspect)
- Docker named volumes
- Bash scripting

## Sources Consulted
- Portainer CE official installation docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer upgrade docs: https://docs.portainer.io/start/upgrade/docker
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker volume backup/restore guide: https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes
- Portainer CE image on Docker Hub: https://hub.docker.com/r/portainer/portainer-ce
- OCI image-spec annotations: https://github.com/opencontainers/image-spec/blob/main/annotations.md

## Issues Found
No technical issues found.

All commands and configuration in the post match Portainer's official upgrade procedure for Docker standalone hosts:
- `portainer/portainer-ce` is the correct Docker Hub image for Portainer CE.
- Port `9443` is the correct HTTPS UI port for Portainer 2.x (port `9000` HTTP was removed/deprecated in newer releases), and `8000` is the correct Edge Agent tunnel port.
- `-v /var/run/docker.sock:/var/run/docker.sock` and `-v portainer_data:/data` are the canonical mounts.
- The backup pattern using an ephemeral `alpine` container with `tar czf` is the standard Docker-documented way to back up a named volume.
- `docker container rm` is a valid long-form command (equivalent to `docker rm`); the named volume is preserved since it is not bound to the container lifecycle.
- `--restart=always` is a valid restart policy.
- `docker ps --filter name=portainer` and `docker inspect --format ...` syntax is correct.

## Review Notes
- The `org.opencontainers.image.version` label used in the `docker inspect` example is set on recent Portainer CE images, but if a reader pins to a very old tag that didn't set this label, the output will show `<no value>`. This does not affect correctness of the command.
- Version `2.21.0` is used only as an illustrative pinned example; by the date of this review Portainer has released newer versions, but the example remains syntactically and historically valid.
- The author URL `https://www.github.com/nawazdhandala` works (GitHub redirects from `www.`) though the canonical form is `https://github.com/...`. This is stylistic, not a technical error.
- The guide is specifically scoped to Docker standalone; Swarm and Kubernetes upgrade paths differ and are out of scope, which the title correctly signals.
