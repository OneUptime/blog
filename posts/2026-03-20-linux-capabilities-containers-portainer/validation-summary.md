# Validation Summary: How to Configure Linux Capabilities for Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Linux capabilities
- NVIDIA GPU container support
- Linux container runtime settings (`--device`, `--sysctl`, `--shm-size`, `--dns`, `--privileged`)

## Sources Consulted
- Portainer Docs: Add a new container — https://docs.portainer.io/user/docker/containers/add
- Portainer Docs: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced
- Docker Docs: Running containers — https://docs.docker.com/engine/containers/run/
- Docker Docs: `docker container run` reference — https://docs.docker.com/reference/cli/docker/container/run
- Docker Official Image docs: `nginx` — https://hub.docker.com/_/nginx/
- Docker Hub tags: `tensorflow/tensorflow` — https://hub.docker.com/r/tensorflow/tensorflow/tags
- Docker Hub tags: `pytorch/pytorch` — https://hub.docker.com/r/pytorch/pytorch/tags

## Issues Found
- The introduction said Portainer exposes Docker's "full feature set" in the UI. I changed this to "a broad set of Docker runtime options" because the current Portainer docs document many advanced settings but not the full Docker CLI surface.
- The setup steps said "creating or editing" a container while the navigation shown was only for creating a new container. I changed the wording to creation only so it matches the documented path `Containers > Add container`.
- The Portainer UI breadcrumbs used `Advanced settings` and `GPUs`. I updated them to the current documented labels `Advanced container settings` and `GPU`.
- The GPU section omitted a current Portainer limitation. I added that Portainer GPU support is currently only available for Docker Standalone environments and only supports NVIDIA GPUs, matching the official docs.
- The Linux capabilities example for `nginx:latest` dropped all capabilities but only re-added `NET_BIND_SERVICE` and `CHOWN`. I changed it to re-add `NET_BIND_SERVICE`, `SETUID`, and `SETGID`, because the official NGINX image drops worker privileges to the `nginx` user/group and needs UID/GID manipulation when starting from a `--cap-drop ALL` profile.
- The DNS example included `--dns-search example.com`, but the current Portainer container UI docs only document primary and secondary DNS server fields. I removed the search-domain example and mapped the section to the documented DNS fields.
- The privileged-mode comment said privileged containers have "full host access". I changed this to wording consistent with Docker's docs: privileged mode grants all capabilities and broad host access.

## Review Notes
- Reviewed against the current Portainer documentation at the time of validation (Portainer 2.39 LTS docs). Older Portainer releases may show slightly different UI wording or field placement.
- The sample images `myimage:latest`, `myapp:latest`, and `systool:latest` are illustrative placeholders, not specific recommended images.
