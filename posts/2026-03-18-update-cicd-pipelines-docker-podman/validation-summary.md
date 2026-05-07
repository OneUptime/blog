# Validation Summary: How to Update CI/CD Pipelines from Docker to Podman

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Podman
- Docker
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Skopeo
- Buildah
- Linux container storage drivers
- Container registries

## Sources Consulted
- Podman documentation: podman CLI, rootless mode, and daemonless operation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman documentation: podman build: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman documentation: podman push: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman documentation: podman login: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman documentation: podman system prune: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman documentation: podman system df: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman installation documentation for Ubuntu and fuse-overlayfs: https://podman.io/docs/installation
- GitLab Runner documentation: use Podman with the Docker executor: https://docs.gitlab.com/runner/executors/docker/
- GitLab Runner documentation: use Podman with the Kubernetes executor: https://docs.gitlab.com/runner/executors/kubernetes/use_podman_with_kubernetes/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Skopeo upstream documentation for copy and registry credentials: https://github.com/containers/skopeo

## Issues Found
- The Docker-in-Docker replacement example built and pushed the unqualified local image name `myapp`. Podman treats unqualified build tags as local names and the official Podman documentation recommends fully qualified names for registry operations. I changed the example to tag the image as `${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}`, log in to the GitLab registry, and push that fully qualified image.
- The runner setup configured rootless overlay storage with `mount_program = "/usr/bin/fuse-overlayfs"` but did not install `fuse-overlayfs`. I added `fuse-overlayfs` to the Ubuntu package installation command so the shown storage configuration has its required helper available.

## Review Notes
- The examples are broadly correct for Linux CI runners, but Podman-in-container setups still depend on runner configuration such as privilege, user namespace, storage driver, and SELinux settings. The post already points readers toward storage driver configuration, but future revisions could add a short caveat that runner-specific setup may be required.
- The GitLab examples use `podman login -p`, which works, but password-stdin or a job-scoped auth file would reduce credential exposure in logs and process listings.
