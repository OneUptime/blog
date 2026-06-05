# Validation Summary: How to Enable Docker Experimental Features

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker CLI
- Docker Engine daemon
- Docker Desktop
- BuildKit
- CRIU checkpoint and restore
- containerd image store
- systemd service overrides

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker deprecated features: https://docs.docker.com/engine/deprecated/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- dockerd reference: https://docs.docker.com/reference/cli/dockerd/
- docker version reference: https://docs.docker.com/reference/cli/docker/version/
- docker info reference: https://docs.docker.com/reference/cli/docker/system/info/
- docker build --squash reference: https://docs.docker.com/reference/cli/docker/image/build/
- docker checkpoint reference: https://docs.docker.com/reference/cli/docker/checkpoint/
- Docker Build checks: https://docs.docker.com/build/checks/
- containerd image store with Docker Engine: https://docs.docker.com/engine/storage/containerd/
- Docker Desktop settings: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- docker manifest reference: https://docs.docker.com/reference/cli/docker/manifest/

## Issues Found
- The post described `DOCKER_CLI_EXPERIMENTAL` and the CLI `config.json` `"experimental"` field as current ways to enable Docker CLI experimental features. Updated the post to state that CLI experimental features have been enabled by default since Docker 20.10, and that these toggles were deprecated in Docker 19.03 and removed in Docker 23.0.
- The post used `docker version --format '{{.Client.Experimental}}'`, which is no longer valid in current Docker because the client experimental field was removed from `docker version` JSON output in Docker 23.0. Removed that command and kept daemon-side checks.
- The Docker Desktop section claimed a single "Experimental features" toggle manages both CLI and daemon flags. Updated it to use the Docker Engine JSON settings for daemon experimental mode and to distinguish Docker Desktop Beta features from Engine daemon experimental mode.
- The `--squash` explanation overstated that squashing simply reduces image size and eliminates caching benefits. Updated it to match Docker's documented behavior: it squashes newly built layers into one new layer, preserves build cache, and can reduce sharing or pull efficiency.
- The BuildKit example used inline cache metadata as a generic experimental feature. Replaced it with Docker's current experimental Dockerfile build checks opt-in example.
- The containerd image store section described the feature as experimental and required `"experimental": true`. Updated it to reflect that containerd image store is the default for fresh Docker Engine 29.0 and later installations, can be enabled with `"containerd-snapshotter": true`, and that automatic migration is the experimental feature.
- The post said `docker manifest` commands had become stable. Updated it because the Docker CLI reference still marks `docker manifest` as experimental.

## Review Notes
The daemon-side `daemon.json` and `dockerd --experimental` examples are correct for Docker Engine. The systemd override example is technically valid, but future improvements could mention preserving distribution-specific `ExecStart` flags when replacing the service command.
