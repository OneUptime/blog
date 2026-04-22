# Validation Summary: How to Set Shared Memory Size for Containers in Portainer - Size Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker containers
- Docker CLI
- Linux shared memory (`/dev/shm`)
- Linux device mappings
- Linux sysctls
- NVIDIA GPU access for containers
- Linux capabilities
- Container DNS settings
- Docker privileged mode

## Sources Consulted
- Portainer documentation: Add a new container - https://docs.portainer.io/user/docker/containers/add
- Portainer documentation: Edit or duplicate a container - https://docs.portainer.io/user/docker/containers/edit
- Portainer documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Docker documentation: `docker container run` CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker documentation: Running containers, runtime privilege and Linux capabilities - https://docs.docker.com/engine/containers/run/
- Docker documentation: GPU access - https://docs.docker.com/engine/containers/gpu/
- NVIDIA Container Toolkit documentation: Specialized Configurations with Docker - https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html

## Issues Found
- The description used `dev/shm` instead of the absolute Linux path `/dev/shm`. Updated it to `/dev/shm` to match Docker and Portainer documentation.
- The introduction claimed Portainer exposes Docker's "full feature set" through the UI. Portainer exposes many Docker runtime and resource settings, but not every Docker feature. Updated the wording to "many Docker runtime settings."
- The access instructions said "creating or editing" but only gave the add-container navigation path. Updated the wording to "creating a container" so the steps match Portainer's documented Add container flow.
- The Portainer UI references used "Advanced settings" and "GPUs." Updated them to "Advanced container settings" and "GPU" to match Portainer's documented labels.
- The privileged-mode comment said privileged containers have "full host access." Docker documents privileged mode as granting extended privileges, all capabilities, access to all host devices, and nearly host-equivalent access. Updated the wording to "broad host-level access" to avoid overstating it.

## Review Notes
- Docker was not installed in the local environment, so CLI verification was performed against Docker's official CLI reference rather than local `docker run --help` output.
- The Docker options shown (`--device`, `--sysctl`, `--gpus`, `--cap-drop`, `--cap-add`, `--shm-size`, `--dns`, `--dns-search`, and `--privileged`) are current and documented.
- Portainer's shared memory field expects the size in MB. The Docker CLI example using `--shm-size=2g` is valid, but a future content improvement would be to mention the equivalent Portainer value of `2048` MB.
- The author GitHub link and OneUptime link were checked and resolved successfully.
