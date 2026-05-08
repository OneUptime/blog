# Validation Summary: How to Install Podman on Arch Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Arch Linux
- pacman
- Rootless containers
- containers/storage storage.conf
- containers/image registries.conf
- systemd user sockets
- Buildah
- Skopeo
- AUR

## Sources Consulted
- Podman official installation documentation: https://podman.io/docs/installation
- Podman official podman(1) documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman official rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman official system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman official stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Arch Linux podman package page: https://archlinux.org/packages/extra/x86_64/podman/
- Arch Linux containers-common file list: https://archlinux.org/packages/extra/any/containers-common/files/
- Arch Linux containers-registries.conf(5) manual: https://man.archlinux.org/man/containers-registries.conf.5.en
- Arch Linux containers-storage.conf(5) manual: https://man.archlinux.org/man/containers-storage.conf.5.en

## Issues Found
- The post described `slirp4netns` as a dependency needed for rootless operation. Current Podman documentation says `pasta` is required for rootless network devices, and Arch's `podman` package depends on `passt`, which provides it. I changed the package command and summary to reference `passt`/`pasta` instead of `slirp4netns`.
- The post implied `fuse-overlayfs` should always be configured for rootless storage. Current Podman supports native rootless overlay on suitable kernels and automatically uses `fuse-overlayfs` when needed and installed, unless a user storage.conf already exists. I adjusted the wording to present the storage.conf snippet as conditional for systems that need `fuse-overlayfs`.
- The troubleshooting note for overlay storage did not mention that the reset should follow the appropriate `fuse-overlayfs` mount-program configuration. I clarified the wording while keeping the existing command sequence.

## Review Notes
- Arch's current `podman` package already depends on `shadow`, `passt`, and an OCI runtime provider, so some explicit install and troubleshooting commands are redundant but still harmless.
- The registry configuration snippet uses the current TOML `unqualified-search-registries` format. Fully qualified image names remain preferable for avoiding short-name ambiguity.
- The Podman socket commands and `DOCKER_HOST` value match the official Podman system service documentation.
