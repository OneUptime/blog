# Validation Summary: How to Use Ansible to Run Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker collection
- Docker
- Docker Compose V2
- Docker Compose files
- Jinja2 templates
- Ansible Vault
- PostgreSQL
- Redis
- Nginx

## Sources Consulted
- Ansible community.docker.docker_compose_v2 module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible community.docker.docker_container_exec module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_exec_module.html
- Ansible community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose scale CLI reference: https://docs.docker.com/reference/cli/docker/compose/scale/

## Issues Found
- The prerequisites incorrectly recommended `pip install docker docker-compose` for a post centered on `community.docker.docker_compose_v2`. The modern module directly calls the Docker CLI and requires the Docker Compose CLI plugin, while the old `docker-compose` Python package is Compose V1-era tooling. Updated the prerequisite command and text to require Docker Compose V2, specifically Docker CLI with the Compose plugin 2.18.0 or later.
- The service scaling example said it scaled workers to three instances but did not set the module's `scale` parameter. Added `scale: { worker: 3 }` using the documented `docker_compose_v2` dictionary format.
- The environment file example passed an absolute path in `env_files`, but the module documents `env_files` paths as relative to `project_src`. Changed the example to use `.env`.

## Review Notes
The remaining examples are technically plausible as deployment patterns, but several are illustrative and assume the referenced application files, images, health endpoints, and container names exist in the target environment. The `docker_compose_v2` module also depends on Docker Compose CLI output, and the official Ansible documentation notes that new Docker Compose plugin releases can change behavior.
