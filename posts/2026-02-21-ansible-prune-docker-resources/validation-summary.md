# Validation Summary: How to Use Ansible to Prune Docker Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker Engine pruning commands
- Docker labels
- Cron-based maintenance automation
- Docker build cache cleanup

## Sources Consulted
- Ansible community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Ansible community.docker.docker_host_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_host_info_module.html
- Ansible community.docker.docker_image_build module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_build_module.html
- Docker prune unused objects documentation: https://docs.docker.com/engine/manage-resources/pruning/
- Docker image prune CLI reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker builder prune CLI reference: https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker object labels documentation: https://docs.docker.com/engine/manage-resources/labels/
- Local Docker CLI help for `docker container prune`, `docker image prune`, and `docker network prune`.

## Issues Found
- The image pruning example described `until: "168h"` as removing images "not used in the last 7 days." Docker's image prune `until` filter selects images by creation time, not last-used time. Changed the task name to "Remove images created more than 7 days ago."
- The label-protection example used container labels to protect images from image pruning. Docker image prune filters image labels, not container labels. Replaced the `docker_container` deployment snippet with a `docker_image_build` example that labels the image at build time.
- The `docker_host_info` example claimed to list all containers but omitted `containers_all: true`; by default, the module only returns running containers. Added `containers_all: true` so stopped containers are included.
- The dangling image explanation described dangling images as layers. Docker defines dangling images as untagged images not referenced by any container. Updated the wording accordingly.
- The scheduled cleanup playbook copied a script to `/opt/scripts/docker-cleanup.sh` without ensuring `/opt/scripts` exists. Added a directory creation task before the copy task.
- The build cache task was named "Prune build cache older than 7 days" but did not configure a filter. Added `builder_cache_filters` with `until: "168h"`.
- Quoted `"label!"` filter keys in Ansible examples to match the official module examples and avoid YAML parser ambiguity.

## Review Notes
The examples assume Docker uses the default data root at `/var/lib/docker` for the disk usage check. Environments with a custom Docker data root should adjust that path.
