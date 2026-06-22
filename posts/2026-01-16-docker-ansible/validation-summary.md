# Validation Summary: How to Deploy Docker Containers with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Ansible
- Ansible Galaxy
- community.docker Ansible collection
- Ubuntu apt repositories
- Docker images, containers, networks, and volumes

## Sources Consulted
- Ansible community.docker collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/index.html
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker.docker_compose_v2 module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- community.docker.docker_network module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- community.docker.docker_volume module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_volume_module.html
- community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin installation documentation: https://docs.docker.com/compose/install/linux/
- ansible.builtin.deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- ansible.builtin.apt_key and apt_repository deprecation documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible filter documentation for default values: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html

## Issues Found
- The Docker installation playbook used `apt_key` and `apt_repository`, which are deprecated in current Ansible documentation. Replaced them with `ansible.builtin.deb822_repository` and added `python3-debian`, which the module requires.
- The Docker Compose example used `/opt/app/.env` under `env_files`. The `docker_compose_v2` documentation states these paths are relative to `project_src`, so this was changed to `.env`.
- The complete playbook used `default('latest')` for `APP_VERSION`, which does not replace an empty string returned from an unset environment lookup. Changed it to `default('latest', true)` so the fallback is applied.

## Review Notes
- The `community.docker.docker_image` examples remain valid, but the current collection documentation recommends the newer single-purpose image modules for new work.
- The examples assume Ubuntu hosts on amd64 architecture and Docker Compose v2 via the Docker CLI plugin.
