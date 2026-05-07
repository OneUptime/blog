# Validation Summary: How to Set Up Auto-Remove for Containers in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker containers

## Sources Consulted
- Portainer documentation, Add a new container: https://docs.portainer.io/2.27/user/docker/containers/add
- Portainer documentation, Advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker CLI reference, `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Engine documentation, Running containers: https://docs.docker.com/engine/containers/run/

## Issues Found
- The post body did not describe Portainer's auto-remove feature. It documented unrelated advanced settings such as devices, sysctls, GPUs, capabilities, shared memory, DNS, and privileged mode. I replaced those sections with instructions that match the title and description.
- The original instructions incorrectly implied that auto-remove is configured under Advanced container settings. I corrected this to Portainer's documented **Actions** section on the Add container form.
- The original post did not show the Docker equivalent of Portainer's auto-remove option. I added the correct `docker run --rm` example.
- The original post omitted important Docker behavior for `--rm`. I added the documented caveats that anonymous volumes are removed automatically, named volumes are preserved, and `--rm` cannot be combined with `--restart`.

## Review Notes
- The Portainer page surfaced by official documentation is versioned under `2.27` in the current docs site, but the documented `Auto remove` behavior aligns with Docker's current `--rm` semantics.
