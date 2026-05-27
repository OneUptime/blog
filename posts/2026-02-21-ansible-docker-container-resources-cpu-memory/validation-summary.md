# Validation Summary: How to Use Ansible to Manage Docker Container Resources (CPU/Memory)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker containers
- Docker Swarm services
- Linux cgroups
- PostgreSQL official Docker image
- Redis official Docker image

## Sources Consulted
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker CLI reference: docker container stats - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Ansible community.docker.docker_container module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible community.docker.docker_swarm_service module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_service_module.html
- Ansible ansible.builtin.command module - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module - https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Docker Hub: postgres Official Image - https://hub.docker.com/_/postgres
- PostgreSQL Documentation: postgres server command - https://www.postgresql.org/docs/current/app-postgres.html

## Issues Found
- The post described reservations as a minimum amount guaranteed to the container. That is too strong for the Docker features shown: standalone memory reservations are soft limits, while Swarm reservations are used by the scheduler. Updated the wording to distinguish those behaviors.
- The Ansible `community.docker` memory examples used lowercase unit suffixes and the text described decimal `k`, `m`, and `g` suffixes. The module documentation specifies `B`, `K`, `M`, `G`, `T`, and `P`, with binary units for `K` and above. Updated the examples and explanatory text accordingly.
- The PostgreSQL container example used `POSTGRES_SHARED_BUFFERS` and `POSTGRES_EFFECTIVE_CACHE_SIZE`, which are not supported environment variables for the official PostgreSQL image. Replaced them with the supported `command` form using `postgres -c shared_buffers=... -c effective_cache_size=...`.
- The OOM kernel log task used `ansible.builtin.command` with a pipe. The command module does not process shell metacharacters such as `|`, so the task would not work as written. Changed it to `ansible.builtin.shell` and added conservative `failed_when` handling.

## Review Notes
The main Docker resource-limit behavior, CPU controls, `docker stats` formatting, OOMKilled inspection, and Swarm `limits` / `reservations` structure are consistent with current official documentation. The sizing guidance is reasonable as a starting point, but it remains workload-dependent and should be validated with production metrics.
