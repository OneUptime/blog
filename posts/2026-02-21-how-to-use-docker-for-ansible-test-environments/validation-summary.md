# Validation Summary: How to Use Docker for Ansible Test Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Docker
- Docker Compose
- GitHub Actions
- YAML

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule Docker containers example: https://docs.ansible.com/projects/molecule/examples/docker/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- community.docker connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_connection.html
- community.docker collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/index.html
- Docker container run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/

## Issues Found
- The Molecule installation command used the older standalone `molecule-docker` package. Updated it to install `molecule-plugins[docker]` and added the required Ansible collections `community.docker` and `ansible.posix`.
- The role initialization command used `molecule init role my_role --driver-name docker`, which is no longer available in current Molecule. Replaced it with `ansible-galaxy role init my_role`, `cd my_role`, and `molecule init scenario`.
- The Molecule dependency configuration referenced `requirements.yml`, but the post did not create that file. Removed the unused `requirements-file` option to avoid a failing dependency step in the shown scenario.
- The direct Docker connection examples used the short connection name `docker`. Updated them to the documented fully qualified connection plugin name `community.docker.docker`.
- The direct `docker run` example omitted the cgroup namespace and tmpfs mounts used elsewhere for systemd containers. Added `--cgroupns=host`, `--tmpfs /run`, and `--tmpfs /tmp`.
- The GitHub Actions workflow built only one image per matrix run while the Molecule scenario required both `ansible-test/ubuntu2204` and `ansible-test/rockylinux9`. Removed the unused matrix and changed the workflow to build both images before running `molecule test`.

## Review Notes
The remaining examples are broadly accurate for Docker-based Ansible role testing, but systemd-in-container behavior can still vary by host Docker version, cgroup mode, and CI runner restrictions. The post correctly notes that workloads needing kernel, disk, or network-stack changes are better tested with VMs or cloud instances.
