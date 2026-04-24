# Validation Summary: How to Configure Custom Host File Entries for Containers in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- `/etc/hosts`
- Container networking
- Bind mounts

## Sources Consulted
- Docker Compose services reference (`extra_hosts`) - https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference (`version` top-level element obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI reference: `docker container run` (`--add-host`, `host-gateway`, `host.docker.internal`) - https://docs.docker.com/reference/cli/docker/container/run/
- Docker daemon reference (`host-gateway` resolution on Linux) - https://docs.docker.com/reference/cli/dockerd/
- Docker Desktop networking how-tos (`host.docker.internal` on Docker Desktop) - https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker networking overview (`/etc/hosts`, custom hosts, default gateway behavior) - https://docs.docker.com/engine/network/
- Docker bind mounts documentation - https://docs.docker.com/engine/storage/bind-mounts/
- Portainer docs: Add a new container - https://docs.portainer.io/sts/user/docker/containers/add
- Portainer docs: Advanced container settings - https://docs.portainer.io/sts/user/docker/containers/advanced
- Portainer docs: Edit or duplicate a container - https://docs.portainer.io/sts/user/docker/containers/edit
- Portainer docs: How Relative Path Support works in Portainer - https://docs.portainer.io/sts/advanced/relative-paths

## Issues Found
- The Compose examples used the obsolete top-level `version` field and used `:` in `extra_hosts` short syntax. I removed `version` and changed the examples to the current preferred `HOST=IP` format.
- The `host.docker.internal` explanation implied that the hostname resolves automatically everywhere. I corrected this to distinguish Docker Desktop behavior from Docker Engine on Linux, where `host.docker.internal=host-gateway` is the documented pattern.
- The older-Linux fallback command described the discovered address as the host IP. I corrected the wording to call it the container's gateway IP, which is what the command actually returns.
- The Portainer UI steps were not aligned with the current docs. I updated them to use **Advanced container settings** and the **Network** section's **Hosts file entries** field, and I corrected the existing-container workflow to Portainer's documented **Duplicate/Edit** replacement flow.
- The bind-mount example used a relative path, which is not generally safe guidance for Portainer stacks because relative path volumes are a special feature in Portainer Business Edition Git deployments. I changed the example to an absolute path on the Docker host.
- The common-use-cases table mixed `/etc/hosts` line format with `extra_hosts` syntax and treated `host-gateway` like a literal hosts-file value. I converted the table to consistent `extra_hosts` mappings.
- The verification section contradicted itself by first saying `nslookup` would use `/etc/hosts` and then immediately noting that it would not. I removed the `nslookup` step and replaced it with direct inspection of the injected hosts entry.

## Review Notes
- The post is technically correct after the fixes and matches current Docker and Portainer documentation as of April 24, 2026.
- `host.docker.internal=host-gateway` is specifically the documented Linux Engine pattern; on Docker Desktop, `host.docker.internal` is available without adding an `extra_hosts` entry.
- Overriding `/etc/hosts` with a bind mount hides Docker-managed entries unless you recreate them in the mounted file.
- The examples were reviewed against current official documentation and were not executed in this workspace.
