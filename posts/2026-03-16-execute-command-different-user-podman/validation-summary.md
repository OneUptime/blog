# Validation Summary: How to Execute a Command as a Different User in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- `podman exec`
- Linux users, groups, UIDs, and GIDs
- NGINX container image
- PostgreSQL container image

## Sources Consulted
- Official Podman `podman exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Dockerfile `USER` instruction reference: https://docs.docker.com/reference/builder/#user
- Docker container run user option reference: https://docs.docker.com/engine/containers/run/
- Official NGINX Docker image documentation: https://hub.docker.com/_/nginx
- Official PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres

## Issues Found
No technical issues found.

## Review Notes
The local review environment did not have the `podman` binary installed, so command behavior was verified against official Podman documentation rather than local `podman --help` output. The `--user` option syntax and behavior described in the post match the official `podman exec` documentation. The examples using `nginx:latest` and `postgres:latest` are plausible for the current official images, though exact UID/GID values and available named users can vary by image variant and image version.
