# Validation Summary: How to Configure Molecule with Docker Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- molecule-plugins Docker driver
- Docker containers, networks, volumes, ports, cgroups, and tmpfs mounts
- systemd inside containers
- YAML configuration
- Dockerfile templates

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule custom image guide: https://docs.ansible.com/projects/molecule/guides/custom-image/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- ansible-community/molecule-plugins Docker driver source: https://github.com/ansible-community/molecule-plugins
- community.docker.docker connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_connection.html
- Docker port publishing documentation: https://docs.docker.com/engine/network/port-publishing/
- Docker network driver documentation: https://docs.docker.com/engine/network/drivers/
- Docker runtime privilege and container run documentation: https://docs.docker.com/engine/containers/run/
- Docker tmpfs mount documentation: https://docs.docker.com/engine/storage/tmpfs/

## Issues Found
- The systemd examples used `command: ""` and described that as the way to preserve the image default CMD. Current molecule-plugins Docker driver documentation and source state that images with a CMD should use `override_command: false`; otherwise Molecule supplies its own long-running shell command by default. Changed all systemd examples and troubleshooting text to use `override_command: false`.
- The custom Docker network inventory example placed `webservers` and `databases` directly under `provisioner.inventory.hosts`. Molecule documentation says `hosts` must follow Ansible YAML inventory format starting with `all`, and Molecule can generate inventory groups from `platforms[*].groups`. Changed the example to assign `groups` on each platform and kept only `group_vars` in the provisioner inventory.
- The custom Dockerfile example set `image: "molecule-custom:latest"` while the Dockerfile template used `FROM {{ item.image }}`, which would try to build from `molecule-custom:latest` instead of from a real base image. Changed the image to `ubuntu:22.04`, matching Molecule's documented behavior of using `platforms[*].image` as the base for custom builds.
- The custom Dockerfile example defined a systemd CMD but did not include the container settings needed to run that CMD under Molecule. Added the same privileged, cgroup, tmpfs, and `override_command: false` settings used elsewhere in the post.
- The Docker connection example used `ansible_connection: docker`. The current community.docker connection plugin documentation and molecule-plugins Docker driver use the fully qualified `community.docker.docker` connection plugin name. Updated the example accordingly.

## Review Notes
- The post still uses pre-ansible-native Molecule `driver`, `platforms`, and `provisioner` configuration, which is documented but marked by Molecule as a pre-ansible-native construct. This is acceptable for a Docker driver tutorial, but future updates could mention the newer ansible-native approach.
- The local environment did not have Molecule installed, so CLI behavior was checked against official documentation and the upstream molecule-plugins Docker driver source instead of local `molecule` help output.
