# Validation Summary: How to Execute a Command Inside a Running Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- NGINX container image
- Shell commands

## Sources Consulted
- Podman `exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman `ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Docker Hub NGINX Official Image documentation: https://hub.docker.com/_/nginx
- Official NGINX Dockerfiles repository: https://github.com/nginx/docker-nginx

## Issues Found
- The examples used `ps aux`, `ss -tlnp`, `nslookup`, `ip addr show`, and `free -m` inside the stock `nginx:latest` container. These commands often require packages that are not guaranteed to be present in minimal container images. Replaced them with `/proc`-based commands and `getent hosts`, which are more appropriate for the demonstrated NGINX image.
- The container ID example said "just the first few characters" of the ID. Podman accepts container IDs and prefixes, but a short prefix must be unique. Updated the wording to "a unique prefix" and used a longer 12-character prefix.

## Review Notes
Podman was not installed in the local workspace, so command behavior was checked against official Podman documentation rather than local `--help` output. The remaining examples use current Podman syntax and are technically accurate for a running container.
