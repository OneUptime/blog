# Validation Summary: How to Configure Docker Daemon with a Custom daemon.json File

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker daemon configuration
- daemon.json
- Docker logging drivers
- Docker storage drivers and containerd image store
- Docker bridge networking
- Docker security options
- Docker runtime and resource configuration
- Docker registry mirrors and insecure registries
- Docker daemon Prometheus metrics
- systemd and journald

## Sources Consulted
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- dockerd CLI and daemon configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker JSON file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker logging driver configuration: https://docs.docker.com/engine/logging/configure/
- Docker journald logging driver: https://docs.docker.com/engine/logging/drivers/journald/
- Docker storage driver selection: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker OverlayFS storage driver: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker containerd image store: https://docs.docker.com/engine/storage/containerd/
- Docker Btrfs storage driver: https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker deprecated Engine features: https://docs.docker.com/engine/deprecated/
- Docker bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker user namespace remapping: https://docs.docker.com/engine/security/userns-remap/
- Docker seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- Docker live restore: https://docs.docker.com/engine/daemon/live-restore/
- Docker Prometheus metrics: https://docs.docker.com/engine/daemon/prometheus/
- Docker Desktop settings: https://docs.docker.com/desktop/settings-and-maintenance/settings/

## Issues Found
- The post stated that every `daemon.json` change requires a Docker restart. Docker supports live reload for a defined set of daemon options, so this was changed to say most changes require a restart.
- The live reload examples omitted several currently supported reloadable options. The list was expanded to include `live-restore`, runtime configuration, registry settings, and related options documented in the `dockerd` reference.
- The `overlay2` example used `overlay2.override_kernel_check=true`. Docker deprecated this option in v19.03 and removed it in v24.0, so the removed option was deleted from the example.
- The storage section described `overlay2` as the general recommendation without noting current Docker Engine behavior. The text was adjusted to describe `overlay2` as the classic storage driver and mention that fresh Docker Engine 29.0+ installations use the containerd image store by default.
- The `data-root` section implied that `data-root` moves all Docker image and container data. Docker Engine 29.0+ with the containerd image store keeps image contents and snapshots under containerd's root, so a clarifying sentence was added.
- The complete production configuration set `metrics-addr` while leaving `experimental` as `false`. The `dockerd` reference documents daemon metrics as experimental, so `experimental` was changed to `true` in that example.

## Review Notes
The remaining snippets are syntactically valid JSON and use documented Docker daemon configuration keys. Some settings are environment-specific, such as storage driver choice, cgroup driver, `icc`, `iptables`, and public metrics binding, so production users should still validate them against their Docker Engine version, operating system, and network/security requirements.
