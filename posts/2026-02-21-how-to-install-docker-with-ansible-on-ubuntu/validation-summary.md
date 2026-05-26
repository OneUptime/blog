# Validation Summary: How to Install Docker with Ansible on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Docker Engine
- Docker Compose plugin
- Ubuntu APT repositories
- systemd
- Docker daemon configuration
- community.docker Ansible collection

## Sources Consulted
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin installation documentation: https://docs.docker.com/compose/install/linux/
- Docker live restore documentation: https://docs.docker.com/engine/daemon/live-restore/
- Ansible community.docker scenario guide: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docsite/scenario_guide.html
- Ansible community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible ansible.builtin.apt_repository module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/apt_repository_module.html
- Ansible ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html

## Issues Found
- The playbook used `community.docker.docker_container` but the prerequisites did not mention installing the `community.docker` collection. Added the collection installation prerequisite because it is not part of `ansible-core`.
- The playbook installed the obsolete Python `docker-compose` package with `pip`. Replaced that with Ubuntu packages for Python dependencies used by Ansible Docker modules, avoiding the legacy Compose v1 Python package and modern Ubuntu PEP 668 system-pip failures.
- The Docker Compose version variable was unused. Removed it so the playbook no longer implies a pinned Compose version while installing the repository package.
- The old-package removal list was incomplete compared with Docker's current Ubuntu install guidance. Added `docker-compose`, `docker-compose-v2`, `docker-doc`, and `podman-docker`.
- The uninstall example hard-coded `amd64` in the repository definition. Updated it to use `dpkg --print-architecture`, matching the installation snippet and making the example correct on non-amd64 Ubuntu hosts.
- The uninstall example claimed complete removal but did not remove `docker-ce-rootless-extras` or `/var/lib/containerd`. Added both to align with Docker's uninstall guidance.

## Review Notes
The one-line `apt_repository` format remains valid for Ansible even though Docker's current manual Ubuntu instructions show a Deb822 `.sources` file. The post targets Ubuntu 20.04, 22.04, and 24.04; Docker's official repository currently supports those Ubuntu LTS releases.
