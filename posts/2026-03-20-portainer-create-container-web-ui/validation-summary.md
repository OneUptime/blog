# Validation Summary: How to Create a Container in Portainer from the Web UI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Hub and private container registries
- Docker container networking and port publishing
- Docker volumes and bind mounts
- Docker environment variables
- Docker restart policies
- Docker resource limits

## Sources Consulted
- Portainer Documentation: Add a new container - https://docs.portainer.io/user/docker/containers/add
- Portainer Documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Documentation: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer Documentation: View container statistics - https://docs.portainer.io/user/docker/containers/stats
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Hub Official Image: nginx - https://hub.docker.com/_/nginx
- Docker Hub Official Image: redis - https://hub.docker.com/_/redis
- Docker Hub Official Image: postgres - https://hub.docker.com/_/postgres

## Issues Found
- The post said leaving the host port blank would let Portainer assign a random host port. I changed this to Portainer's documented **Publish all exposed network ports to random host ports** option, which is the current documented way to get random host-port assignment from the UI.
- The restart policy list used **No**, which is Docker CLI terminology. I changed this to **Never** to match the current Portainer UI and documentation.
- The post referred to shorthand sections such as **Env** and **Resources**. I updated these references to the current documented locations under **Advanced container settings** so the steps match the current Portainer UI structure.
- The memory limit explanation said the container is killed if the limit is exceeded. I changed this to a simpler hard-limit description to avoid overstating Docker's documented out-of-memory behavior.
- The conclusion claimed Portainer covers **all** the same options as `docker run`. I changed this to **many** of the same options because the documentation supports broad overlap, not full one-to-one parity with every `docker run` flag.

## Review Notes
- Portainer's UI wording can vary slightly between releases, but the corrected terminology matches the current Portainer documentation reviewed on 2026-04-24.
- The example image tags in the post were still valid at review time, but Docker image tags are versioned artifacts and can change over time.
