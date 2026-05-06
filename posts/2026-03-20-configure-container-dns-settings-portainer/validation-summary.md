# Validation Summary: How to Configure Container DNS Settings in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI (`docker run`)
- Container networking and DNS
- Linux container runtime settings (devices, sysctls, GPUs, capabilities, shared memory, privileged mode)

## Sources Consulted
- Portainer Documentation: Add a new container - https://docs.portainer.io/2.27/user/docker/containers/add
- Portainer Documentation: Advanced container settings - https://docs.portainer.io/user/docker/containers/advanced
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/

## Issues Found
- The description and DNS example claimed Portainer supports Docker DNS search domains. Portainer's documented container UI exposes primary and secondary DNS server fields, but not a documented `--dns-search` equivalent, so I removed the search-domain claim and the `--dns-search` flag.
- The introduction said Portainer exposes Docker's "full feature set" through the UI. Portainer's docs describe a range of advanced settings, not the entire Docker feature surface, so I corrected that claim.
- The setup steps said "creating or editing" a container while directing readers to `Containers > Add container`. That navigation is for creating a container, so I corrected the wording.
- Several UI paths used labels that did not match Portainer's docs, including `Advanced settings` and `GPUs`. I updated them to `Advanced container settings` and `GPU`, and added the documented DNS location under the Network section.
- Some example commands used placeholder or non-runnable images and commands such as `myimage:latest`, `myapp:latest`, `systool:latest`, and `python train.py` without providing the script. I replaced those with concrete examples that correctly demonstrate the Docker flags.
- The privileged-mode note said privileged containers have "full host access". Docker documents this more carefully as effectively removing the default sandboxing, so I tightened that wording.

## Review Notes
- Portainer's current docs only document per-container primary and secondary DNS server fields. If Portainer later adds DNS search domain support in the container UI, this post should be reviewed again.
- The device-mapping and GPU examples still depend on compatible host hardware and runtime support, which is expected for these Docker options.
