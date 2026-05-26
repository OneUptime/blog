# Validation Summary: How to Build Docker Images with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker image builds
- Dockerfiles
- Docker build arguments
- Docker multi-stage builds
- Docker image tagging and pushing
- .dockerignore
- Docker pruning

## Sources Consulted
- Ansible community.docker.docker_image module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Ansible community.docker.docker_login module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_login_module.html
- Docker Build variables documentation: https://docs.docker.com/build/building/variables/
- Docker Build context and .dockerignore documentation: https://docs.docker.com/build/concepts/context/
- Docker Build secrets documentation: https://docs.docker.com/build/building/secrets/
- Dockerfile reference: https://docs.docker.com/reference/builder
- Docker image prune documentation: https://docs.docker.com/reference/cli/docker/image/prune/

## Issues Found
- The prerequisites incorrectly instructed readers to install the Docker Python SDK with `pip install docker`. Current `community.docker.docker_image` documentation lists `requests` as the relevant Python requirement and notes that the module does not use the Docker SDK for Python. Changed the command to `pip install requests`.
- The multiple-tag example did not actually retag the versioned image as the git SHA or `latest`. The `community.docker.docker_image` module expects the source image in `name` and the target tag in `repository` when tagging a local image. Updated the git SHA and `latest` tasks to use `name: "{{ registry }}/{{ app_name }}:{{ version }}"` with explicit `repository` values.
- The "Tag and push as latest" task in the registry example would have pushed the version tag again because `repository` omitted `:latest` while `tag` was set to the version. Updated `repository` to include `:latest` and added `force_tag: true`.
- The secrets best practice recommended build arguments for build-time secrets and implied multi-stage builds ensure secrets are excluded from the final image. Docker documentation warns that build arguments and environment variables are inappropriate for secrets because they can persist in metadata/history. Updated the guidance to recommend BuildKit secret mounts or runtime secret injection instead.

## Review Notes
- The `community.docker.docker_image` examples are valid for Docker daemon API builds, but the module documentation now recommends narrower modules such as `community.docker.docker_image_build`, `community.docker.docker_image_tag`, and `community.docker.docker_image_push` for new automation.
- `community.docker.docker_image` does not use BuildKit/buildx. Workflows that require BuildKit features, including secret mounts, should use `community.docker.docker_image_build`.
