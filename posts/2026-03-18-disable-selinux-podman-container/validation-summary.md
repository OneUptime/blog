# Validation Summary: How to Disable SELinux for a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- SELinux
- Linux containers
- Podman Compose / Compose files
- Linux audit tools

## Sources Consulted
- Podman `--security-opt` option documentation: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- Podman `podman run` documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Podman volume option documentation, including `:z`, `:Z`, and `label=disable`: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman Compose documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Docker Compose services reference for `security_opt` syntax: https://docs.docker.com/reference/compose-file/services/
- Red Hat Developer article on SELinux container labeling: https://developers.redhat.com/articles/2025/04/11/my-advice-selinux-container-labeling

## Issues Found
- The post described `--security-opt label=disable` as disabling SELinux enforcement or removing mandatory access control from the container. Podman documentation describes this option as turning off label separation or label confinement for the container. I changed those references to "SELinux label separation" and "label confinement" to avoid implying that host SELinux enforcement is globally disabled.
- The comment above the `/proc/self/attr/current` example said the container process would not have an SELinux label applied. I changed it to say the process will not use Podman's usual container SELinux label, which is more precise for SELinux systems.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior could not be verified with local `podman --help` or live container runs. The commands and configuration were reviewed against official Podman and Compose documentation instead. The `:z` and `:Z` examples are technically correct, but future revisions could mention that relabeling large directory trees can delay container startup and that system directories should generally not be relabeled.
