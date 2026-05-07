# Validation Summary: How to Use Podman in GitLab CI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- GitLab CI/CD
- GitLab Runner
- GitLab Container Registry
- PostgreSQL
- YAML
- Bash

## Sources Consulted
- GitLab Runner Docker executor docs: https://docs.gitlab.com/runner/executors/docker/
- GitLab Runner on Kubernetes with Podman docs: https://docs.gitlab.com/runner/executors/kubernetes/use_podman_with_kubernetes/
- GitLab runner registration docs: https://docs.gitlab.com/runner/register/
- GitLab runner creation and registration workflow docs: https://docs.gitlab.com/ci/runners/new_creation_workflow/
- Podman main CLI docs: https://docs.podman.io/en/stable/markdown/podman.1.html
- Podman build docs: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman save docs: https://docs.podman.io/en/stable/markdown/podman-save.1.html
- Podman load docs: https://docs.podman.io/en/stable/markdown/podman-load.1.html
- Podman login docs: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman network create docs: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html

## Issues Found
- The introduction and summary overstated the security model by saying Podman removes the need for privileged containers. GitLab's official Podman guidance shows that avoiding privileged containers depends on the runner setup, even though Podman is daemonless. I corrected the wording to distinguish between avoiding a Docker daemon sidecar and avoiding privileged execution.
- The runner setup section implied that choosing a Podman job image is sufficient by itself. GitLab's docs require a compatible runner configuration as well, so I updated the explanation to say the runner must already support Podman.
- The `BUILDAH_FORMAT: docker` comment was incorrect. Podman documents `BUILDAH_FORMAT` as selecting the image manifest/configuration format, not controlling log color. I corrected the comment and clarified the `STORAGE_DRIVER: vfs` note so it matches Podman's storage-driver behavior.
- The shell-runner registration example used `--registration-token`, which GitLab documents as deprecated and disabled by default in newer versions. I updated the snippet to use a runner authentication token with `--token`.
- The same registration example configured `--tag-list` on the CLI. GitLab's newer runner creation workflow moves tag configuration to runner creation time in GitLab, so I removed the outdated CLI flag and noted that the `podman` tag should be configured when the runner is created.

## Review Notes
- The Podman CLI examples themselves were otherwise technically sound: `podman build`, `podman save`, `podman load`, `podman login`, `podman run`, `podman exec`, and `podman network create` are all valid as written.
- Container-based Podman jobs remain environment-specific. Depending on the executor, you may still need host-side Podman configuration, rootless prerequisites such as `/etc/subuid` and `/etc/subgid`, or privileged mode in some Kubernetes setups.
