# Validation Summary: How to Use Ansible docker_container Module with Volume Mounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker collection
- Docker containers
- Docker bind mounts
- Docker named volumes
- Docker tmpfs mounts
- PostgreSQL container storage

## Sources Consulted
- Ansible community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible community.docker.docker_volume module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_volume_module.html
- Ansible community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Ansible community.docker.docker_volume_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_volume_info_module.html
- Ansible community.docker.docker_host_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_host_info_module.html
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker tmpfs mounts documentation: https://docs.docker.com/engine/storage/tmpfs/
- Docker container run CLI documentation: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The introduction said data written inside a container is gone when the container stops. Docker keeps stopped containers with their writable layer intact; the data is lost when the container is removed. Updated the wording to say "when a container is removed."
- The tmpfs explanation said sensitive data should "never touch disk." Docker documents that tmpfs data may be written to swap, so the wording was changed to describe tmpfs as non-persistent storage outside the container writable layer with a swap caveat.
- The `tmpfs` example used a YAML mapping, but `community.docker.docker_container.tmpfs` is documented as a list of strings. Changed it to list entries such as `"/tmp:size=100M,mode=1777"`.
- The cleanup example used `community.docker.docker_volume_info` without a required `name` parameter to list all volumes. Replaced it with `community.docker.docker_host_info` and `volumes: true`, which is the documented module for listing Docker volumes.
- The summary said tmpfs is for data that should "never hit disk" and advised always creating host directories before mounting them. Updated this to "should not persist" and clarified that pre-creating host directories applies to bind mounts.

## Review Notes
The examples otherwise use current `community.docker` module names and documented parameters. The `community.docker` collection is not part of `ansible-core`, so users need the collection installed before running these playbooks.
