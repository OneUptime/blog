# Validation Summary: How to Use Molecule with Custom Docker Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Molecule
- Molecule Docker driver
- Docker and Dockerfile syntax
- systemd in Linux containers
- Ubuntu 22.04
- CentOS Stream 9
- Docker Buildx multi-architecture builds
- GitLab CI with Docker-in-Docker
- Linux cgroups v1 and v2

## Sources Consulted
- Ansible Molecule custom image guide: https://docs.ansible.com/projects/molecule/guides/custom-image/
- Ansible Molecule Docker driver create playbook implementation: https://github.com/ansible-community/molecule-plugins/blob/main/src/molecule_plugins/docker/playbooks/create.yml
- Ansible Molecule pre-ansible-native configuration notes: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Docker `docker run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker runtime metrics and cgroup v2 documentation: https://docs.docker.com/engine/containers/runmetrics/
- Dockerfile reference for `CMD` syntax: https://docs.docker.com/reference/dockerfile/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found
- The Molecule platform examples used `command: ""` to preserve the image command. Current Molecule Docker driver behavior sets a default sleep command unless command override is disabled, so systemd might not run as PID 1. Changed the examples to `override_command: false`.
- The `Dockerfile.j2` template checked only `item.command is not none`. If `item.command` was undefined or an empty string, it could render an invalid or unintended `CMD` instruction. Changed the condition to require `item.command` to be defined and non-empty.
- The manual `docker run` examples used `--privileged --cgroupns=host` but did not bind mount `/sys/fs/cgroup` read-write or mount `/run` and `/tmp` as tmpfs, even though the Molecule examples required those settings for systemd containers. Updated the commands to include the matching volume and tmpfs options.
- The cgroup v2 note mentioned Docker Desktop as a default without an official source in the consulted docs. Reworded it to match Docker's documented cgroup v2 defaults for newer Linux distributions and current Docker support.

## Review Notes
The remaining examples are technically plausible but systemd-in-Docker behavior is host- and Docker-version-sensitive. Teams should test the images on the same Docker Engine, cgroup mode, and CI runner type used by their Molecule jobs.
