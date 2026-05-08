# Validation Summary: How to Run Your First Container with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Container images and registries
- Nginx containers
- Alpine Linux containers
- Node.js containers
- PostgreSQL containers
- Ubuntu containers

## Sources Consulted
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman pull` documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman `podman logs` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman `podman exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman `podman machine ls` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman `podman rm` documentation: https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Ubuntu release cycle documentation: https://ubuntu.com/about/release-cycle
- Local verification of `docker.io/library/nginx:latest` image contents with Docker

## Issues Found
- The setup check used `podman info --format "{{.Host.Os}}"`. Podman's Go template fields use exported field names, and the host OS field is `OS`, so this was changed to `podman info --format "{{.Host.OS}}"`.
- The post described unqualified image pulls as pulling from the "default registry." Podman treats unqualified image names as short-name references and resolves them through configured aliases or unqualified-search registries, so the wording was changed to "short-name resolution."
- The Ubuntu example said `ubuntu:22.04` was the latest Ubuntu LTS. As of May 8, 2026, Ubuntu 26.04 LTS has been released, so the comment was changed to "Run Ubuntu 22.04 LTS" without changing the still-valid image tag.
- The Nginx exec example used `podman exec web ps aux`, but the official `nginx:latest` image does not include `ps`. The command was changed to `podman exec web nginx -v`, which works with the official image.

## Review Notes
The remaining commands and flags are consistent with current Podman documentation. The examples still use short image names such as `nginx` and `alpine`; this is valid with Podman's short-name resolution, but fully qualified image references can be preferable in production documentation for reproducibility and supply-chain clarity.
