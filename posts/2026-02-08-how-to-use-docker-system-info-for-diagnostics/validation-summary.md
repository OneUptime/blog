# Validation Summary: How to Use docker system info for Diagnostics

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Docker CLI
- Docker Engine
- Docker storage drivers and containerd snapshotters
- Docker Desktop
- Linux cgroups
- Docker Swarm
- Shell scripting

## Sources Consulted
- Docker CLI reference for `docker system info`: https://docs.docker.com/reference/cli/docker/system/info/
- Docker storage driver selection guide: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker OverlayFS storage driver documentation: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker deprecated Engine features: https://docs.docker.com/engine/deprecated/
- Docker live restore documentation: https://docs.docker.com/engine/daemon/live-restore/
- Docker Desktop for Linux documentation: https://docs.docker.com/desktop/setup/install/linux/
- Kubernetes container runtimes and cgroup driver documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Local Docker CLI help output for `docker info --help` and `docker system info --help`
- Local Docker Engine formatted output from `docker info --format '{{json .}}'`

## Issues Found
- The post treated `overlay2` as the universally expected modern storage driver. Docker Engine 29.0 and later uses the containerd image store by default on fresh installations, which can report `overlayfs` as the storage driver. Updated the text and diagnostic check to accept `overlay2` and `overlayfs`.
- The storage driver warning said `devicemapper` and `aufs` were older drivers. Docker's current docs state that `aufs` was removed in Docker Engine 24.0 and `devicemapper` was removed in Docker Engine 25.0. Updated the wording to "removed or deprecated driver."
- The cgroup driver explanation said it should match the container runtime. Kubernetes documentation says the kubelet and container runtime should use the same cgroup driver. Updated the wording to refer to matching the kubelet on Kubernetes hosts.
- The backing filesystem guidance implied only `extfs` and `xfs` are supported for `overlay2`. Docker's storage driver guide lists additional supported backing filesystems. Updated the wording to say these are common and noted that XFS requires `ftype=1`.
- The `d_type` warning claimed missing support could silently corrupt data. Docker's deprecated-feature documentation says overlay drivers do not work as expected without `d_type`; updated the statement to match Docker's wording more closely.
- The `{{.MemTotal}}` formatted examples implied human-readable memory output. Docker's formatted JSON/template value is a raw byte count. Updated the command output and script label to say "Memory bytes."
- The Docker root directory disk-space command uses host filesystem paths and GNU `df` behavior, so it is Linux-specific. Updated the command comment to state that it applies on Linux.

## Review Notes
The post is technically relevant and the commands are generally valid. Some examples are Linux-focused even though the article discusses Docker Desktop; future revisions could add separate Docker Desktop disk-usage guidance instead of relying on `df` against `DockerRootDir`.
