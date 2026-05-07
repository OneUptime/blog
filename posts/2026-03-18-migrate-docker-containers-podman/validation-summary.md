# Validation Summary: How to Migrate Docker Containers to Podman

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Docker CLI
- Podman CLI
- Skopeo
- jq
- OCI container images
- Container volumes, ports, and environment variables

## Sources Consulted
- Docker CLI reference for `docker container ls` / `docker ps`: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI formatting reference: https://docs.docker.com/go/formatting/
- Docker CLI reference for `docker image save`: local `docker save --help`
- Docker CLI reference for `docker container export`: https://docs.docker.com/reference/cli/docker/container/export/
- Podman documentation for `podman load`: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman documentation for `podman import`: https://docs.podman.io/en/stable/markdown/podman-import.1.html
- Podman documentation for `podman run`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Skopeo project documentation for image transports and `skopeo copy`: https://github.com/containers/skopeo

## Issues Found
- The opening claim said containers could be exported and imported while preserving state and configuration. `docker export` exports a container filesystem, not Docker volumes, and `podman import` creates a filesystem image rather than preserving the original runtime configuration. Updated the claim to say images can be moved directly and containers recreated from inspected configuration.
- The bulk `docker save` example and `docker export` example placed `-o` after the image/container name. Docker documents options before positional arguments, so both examples were updated to put `-o` before the image or container.
- The container recreation script assumed port bindings, environment variables, and mounts always exist. Added `jq` defaults so the sample does not fail for containers with no ports, env vars, or mounts.
- The writable-layer migration section did not mention that `docker export` excludes volumes and that imported images do not preserve metadata such as `CMD` and `ENTRYPOINT`. Added that caveat and showed `podman import --change` for setting a startup command.

## Review Notes
The guide remains intentionally basic. In production migrations, users should also validate Docker Compose or Kubernetes manifests, network drivers, named volume data migration, SELinux labeling for bind mounts on Podman hosts, restart behavior under systemd, and rootless port/user namespace differences.
