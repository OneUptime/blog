# Validation Summary: How to Install and Configure Podman on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Podman (container engine)
- Buildah (image building)
- podman-compose / podman-docker compatibility layers
- containers/image registries.conf and containers/storage storage.conf configuration
- slirp4netns and user namespaces (subuid/subgid) for rootless networking
- systemd unit generation (`podman generate systemd`)
- Kubernetes YAML generation/playback (`podman generate kube` / `podman play kube`)
- Ubuntu 20.04 / 22.04 / 24.04 (apt packaging)

## Sources Consulted
- Podman official installation docs — https://podman.io/docs/installation
- containers/image `containers-registries.conf.5` man page — https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- Ubuntu manpage for containers-registries.conf — https://manpages.ubuntu.com/manpages/jammy/man5/containers-registries.conf.5.html
- containers/podman issue #14336 "Podman won't install on Ubuntu 20.04 any longer" and #17562 "Kubic repository out of date" — https://github.com/containers/podman/issues/14336
- openSUSE software page for devel:kubic:libcontainers:stable — https://software.opensuse.org/download.html?project=devel:kubic:libcontainers:stable
- Red Hat docs on registries.conf v2 / working with container registries — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers

## Issues Found
1. **Deprecated registries.conf v1 syntax.** The post configured search registries using the legacy v1 table:
   ```toml
   [registries.search]
   registries = ['docker.io', 'quay.io', 'ghcr.io']
   ```
   The `registries.conf` shipped with current Podman uses the v2 format, and the v1 `[registries.search]` table is deprecated and **cannot be mixed** with v2 settings (doing so produces errors). Replaced it with the current top-level key `unqualified-search-registries = ['docker.io', 'quay.io', 'ghcr.io']` and added a short note explaining the v1→v2 change.

2. **Discontinued Kubic repository + deprecated `apt-key` for Ubuntu 20.04.** The "Ubuntu 20.04 (via Kubic Repository)" section instructed readers to add the openSUSE `devel:kubic:libcontainers:stable` repo and import its key with `apt-key add`. That repository has been discontinued and no longer ships Podman packages, so the commands would fail. Additionally, `apt-key add` is deprecated and removed in recent Ubuntu releases. Podman was also never in 20.04's native repos (it landed in Ubuntu 20.10). Rewrote the section to explain the situation accurately and recommend upgrading to a supported LTS (22.04/24.04) where `apt install podman` works from the official repos. (Ubuntu 20.04 LTS also reached end of standard support in April 2025.)

## Review Notes
- `podman generate systemd` (used in the "Generate Systemd Services" section) is still functional but has been deprecated since Podman 4.4 in favor of **Quadlet** (`.container`/`.pod` unit files under `~/.config/containers/systemd/`). The commands shown still work; a future revision could mention Quadlet as the preferred approach.
- `podman play kube` / `podman generate kube` remain valid, though newer Podman also exposes them as `podman kube play` / `podman kube generate`. No change needed.
- The rootless networking section uses `slirp4netns`, which is still supported. Note that Podman 4.0+ defaults to the netavark/aardvark stack and increasingly uses `pasta` for rootless networking; `slirp4netns` remains available and the instructions are correct.
- The subuid/subgid setup uses `echo "$USER:100000:65536" | sudo tee /etc/subuid` (which overwrites rather than appends). This works for a fresh single-user setup; `usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER` is the more robust alternative on multi-user systems. Left as-is since it is functionally correct for the tutorial's context.
- All core container/image/volume/network/pod/build commands and flags were verified as correct and current.
