# Validation Summary: How to Configure Rootless Podman in CI Environments

## Status
validated

## Post Type
Tutorial / CI configuration guide

## Technologies Covered
- Podman
- Rootless containers
- User namespaces
- containers/storage storage.conf
- fuse-overlayfs
- GitHub Actions
- GitLab CI
- Linux subuid/subgid mappings

## Sources Consulted
- Podman documentation: `podman(1)` rootless storage notes, https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman documentation: `podman info`, https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman documentation: `podman run`, https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman documentation: `podman build`, https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman documentation: `podman system migrate`, https://docs.podman.io/en/v3.2.2/markdown/podman-system-migrate.1.html
- containers/storage documentation: `containers-storage.conf(5)`, https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- GitHub Actions runner images documentation, https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- GitHub-hosted runners reference, https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- GitLab CI/CD YAML syntax reference, https://docs.gitlab.com/ee/ci/yaml/
- GitLab Runner Podman documentation, https://docs.gitlab.com/runner/executors/kubernetes/use_podman_with_kubernetes/

## Issues Found
- The opening claim said rootless Podman means build containers never run with root privileges and eliminates an entire class of escapes. Rootless containers can still run as UID 0 inside a user namespace, so I changed this to "host root privileges" and "reducing the impact" to avoid an overbroad security claim.
- The kernel check described Linux 4.18+ as the recommended rootless baseline. Current Podman documentation specifically notes native rootless OverlayFS support requires kernel 5.12.9 or newer, with fuse-overlayfs or vfs needed on older kernels, so I updated the comment.
- The storage configuration example wrote an overlay/fuse-overlayfs config and then immediately overwrote it with a vfs config. I changed it to select overlay with fuse-overlayfs when available, otherwise vfs.
- The post referred to fuse-overlayfs as a storage driver. In Podman storage configuration it is an overlay mount helper selected by `mount_program`, so I adjusted the wording.
- The subuid/subgid checks used unquoted `grep $(whoami)` patterns and could fail noisily when files were missing. I changed them to anchored user lookups with `id -un` and `2>/dev/null || true`.
- The post said user namespace mappings are required for rootless operation. Podman can operate with a single UID in constrained environments, though subuid/subgid ranges are recommended and needed for most images. I narrowed the claim accordingly.
- The GitLab CI example used `quay.io/podman/stable:latest` without forcing the job container to run as a non-root user. I changed the image configuration to use GitLab's `image:docker:user` setting with the `podman` user.

## Review Notes
- I could not run Podman locally because the `podman` binary is not installed in this workspace. CLI flags and configuration keys were checked against official Podman and containers/storage documentation instead.
- The GitLab example still depends on runner support for user namespaces and the configured executor. Some GitLab Runner environments may require additional runner-level settings beyond `.gitlab-ci.yml`.
