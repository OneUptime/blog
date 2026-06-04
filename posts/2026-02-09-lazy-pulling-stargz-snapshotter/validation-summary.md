# Validation Summary: How to Use Container Image Lazy Pulling with Stargz Snapshotter on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- containerd CRI configuration
- containerd stargz-snapshotter
- eStargz container image format
- Docker Buildx and BuildKit image exporters
- GitHub Actions
- Prometheus scraping

## Sources Consulted
- containerd stargz-snapshotter README and Kubernetes quick start: https://github.com/containerd/stargz-snapshotter
- containerd stargz-snapshotter install guide: https://github.com/containerd/stargz-snapshotter/blob/main/docs/INSTALL.md
- containerd stargz-snapshotter ctr-remote optimization guide: https://github.com/containerd/stargz-snapshotter/blob/main/docs/ctr-remote.md
- containerd stargz-snapshotter eStargz format guide: https://github.com/containerd/stargz-snapshotter/blob/main/docs/estargz.md
- containerd remote snapshotter documentation: https://containerd.io/docs/2.1/remote-snapshotter/
- containerd CRI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Docker Build image and registry exporter documentation: https://docs.docker.com/build/exporters/image-registry/
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Local `ctr-remote` and `containerd-stargz-grpc` help output from the v0.18.1 release archive.

## Issues Found
- The post used `v0.15.0` release binary URLs, but upstream notes that v0.15.0 did not include release binaries. Updated examples to `v0.18.1` and the current archive naming.
- The install snippet assumed the archive extracted into a `stargz-snapshotter/` directory. The release archive places binaries at the archive root, so the install command now extracts `containerd-stargz-grpc` and `ctr-remote` directly into `/usr/local/bin`.
- The systemd unit was written with `sudo cat >`, which does not apply privileges to shell redirection. Replaced it with `sudo tee`.
- The containerd proxy plugin example omitted the `proxy_plugins.stargz.exports.root` setting shown in upstream examples. Added it and removed an unnecessary legacy registry mirror block.
- The conversion commands used an invalid `--period-msec` flag. Replaced it with `--period=10`, matching `ctr-remote image optimize --help`.
- The post treated Kubernetes pod annotations as the way to select lazy pulling. Stargz lazy pulling is selected by node-level containerd snapshotter configuration for eStargz images, so the unsupported annotations were removed and the explanatory text was corrected.
- The Docker Buildx examples omitted `force-compression=true`, which is commonly needed when base layers are not already eStargz. Added it to the command and GitHub Actions example.
- The GitHub Actions example used older Docker action major versions. Updated to current major versions used by Docker's documentation.
- The monitoring section used `localhost:50051` for metrics, but `containerd-stargz-grpc` serves metrics only when `metrics_address` is configured. Updated the example to configure and scrape `127.0.0.1:8234`.
- The Prometheus recording rules referenced unverified metric names. Replaced them with a scrape configuration example.
- The prefetch section used unsupported pod annotations and a JSON prefetch profile. Replaced it with the documented `ctr-remote image optimize --prefetch-list` workflow.
- The troubleshooting example described `ctr-remote images check` as an eStargz compatibility test. Updated it to the documented singular `ctr-remote image check` form and corrected the comment to local image content availability.

## Review Notes
The tutorial remains valid for clusters where operators can configure containerd on every node. Managed Kubernetes services may restrict node-level containerd and snapshotter configuration, so this approach is operationally dependent on node access.
