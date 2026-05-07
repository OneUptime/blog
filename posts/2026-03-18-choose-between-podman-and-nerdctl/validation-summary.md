# Validation Summary: How to Choose Between Podman and nerdctl

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- nerdctl
- containerd
- BuildKit
- Buildah
- Rootless containers
- CNI and Netavark networking
- systemd and Quadlet
- Kubernetes container runtime integration

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman command reference: https://docs.podman.io/en/stable/Commands.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman auto-update documentation: https://docs.podman.io/en/v4.4/markdown/podman-auto-update.1.html
- Podman network documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-network.1.html
- Podman kube play documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- nerdctl official README and documentation: https://github.com/containerd/nerdctl
- nerdctl release documentation: https://github.com/containerd/nerdctl/releases
- nerdctl command reference: https://raw.githubusercontent.com/containerd/nerdctl/main/docs/command-reference.md
- nerdctl BuildKit setup documentation: https://raw.githubusercontent.com/containerd/nerdctl/main/docs/build.md
- Rootless containerd/nerdctl documentation: https://rootlesscontaine.rs/getting-started/containerd/

## Issues Found
- The nerdctl install examples pinned v1.7.0, which is outdated for a 2026 article. Updated the commands to v2.3.0, matching the current nerdctl release metadata available during review.
- The Podman rootless section said rootless containers work with no additional configuration. Adjusted the wording because rootless use still depends on normal packaged prerequisites such as subordinate UID/GID mappings and rootless networking tools, even though distro packages usually handle this.
- The custom systemd unit for nerdctl used `nerdctl start web`, which exits after starting an existing container and leaves systemd without the container process as the service's foreground process. Replaced it with a foreground `nerdctl run` unit pattern and a cleanup `ExecStartPre`.
- The Podman auto-update example used the short image name `nginx`. Podman's `registry` auto-update policy requires a fully qualified image reference, so the example now uses `docker.io/library/nginx:stable`.
- Updated the "When to Choose Podman" rootless bullet to avoid implying that rootless mode never requires setup.

## Review Notes
The comparison is broadly accurate. nerdctl's Kubernetes-node debugging examples are valid for the `k8s.io` containerd namespace, but logs support is documented by nerdctl as experimental. Podman's default network backend is Netavark in modern Podman, while CNI remains relevant for older setups and migrations.
