# Validation Summary: How to Use Ansible to Build Podman Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- containers.podman Ansible collection
- Podman
- Buildah
- Containerfile / Dockerfile syntax
- OCI container images
- Container registries

## Sources Consulted
- Ansible `containers.podman.podman_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_image_module.html
- Ansible `containers.podman.podman_login` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_login_module.html
- Ansible `containers.podman.podman_logout` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/containers/podman/podman_logout_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Podman `podman build` documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman `podman image prune` documentation: https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html
- Buildah command documentation: https://github.com/containers/buildah/tree/main/docs
- Buildah `buildah config` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-config.1.md
- Buildah `buildah copy` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-copy.1.md
- Buildah `buildah commit` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-commit.1.md
- Buildah `buildah rm` documentation: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-rm.1.md

## Issues Found
- The first Containerfile used `curl` in `HEALTHCHECK`, but the `python:3.12-slim` image does not guarantee that `curl` is installed. Changed the healthcheck to use Python's standard library so it works with the selected base image.
- The multi-stage build example created a Containerfile in `/tmp/build` but did not create or populate the build context before using `COPY go.mod go.sum ./` and other source-copying instructions. Added tasks to create `/tmp/build` and copy the application source into it.
- The recursive `ansible.builtin.copy` tasks set file mode but not directory mode. Added `directory_mode: '0755'` so newly created directories in copied source trees remain traversable.
- The registry example said "tag and push as latest" even though `push_args.dest` pushes to a different destination tag without necessarily creating a local `latest` tag. Renamed the task to "Also push as latest".
- The cleanup example was labeled as removing build cache but only pruned images and Buildah working containers. Added a `podman image prune --build-cache -f` task, which is the documented Podman option for pruning persistent build cache.

## Review Notes
- The examples assume required variables such as `registry_user`, `vault_registry_password`, and source directories such as `app/` or `/opt/source/myapp` are provided by the user's environment.
- The CI test step assumes the built image includes the test suite and `pytest`; that is valid for some project Containerfiles but should be adapted for runtime-only images.
