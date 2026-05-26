# Validation Summary: How to Use Ansible to Manage Container Image Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker collection
- community.general collection
- Docker container images and tags
- Git metadata for tagging
- YAML playbooks

## Sources Consulted
- Ansible community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible community.docker.docker_image_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_info_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The image promotion example looped over production tags but did not use `item`, so it would not create `production-{{ promote_version }}`, `{{ promote_version }}`, or `latest` tags. Updated `repository` to include `:{{ item }}` and added `force_tag: true` so movable tags such as `latest` can be replaced intentionally.
- The cleanup example used `docker_image_info` with an untagged image name. The module treats an omitted tag as `latest`, so it would not inspect all local tags for cleanup. Updated the example to list all local images, iterate over `RepoTags`, filter to the target repository, and remove only unprotected tags.
- The cleanup comment said the task removed old tags from the registry and local storage, but the shown `docker_image` task removes local image tags. Updated the comment to describe local cleanup only.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented module FQCN is `community.general.timezone`. Updated the snippet accordingly.

## Review Notes
The `community.docker.docker_image` examples remain valid, though the latest documentation also points readers to narrower modules such as `community.docker.docker_image_tag`, `community.docker.docker_image_push`, and `community.docker.docker_image_remove` for more specialized workflows. The common-use-case examples are technically plausible but only loosely related to container image tag management.
