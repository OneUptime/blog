# Validation Summary: How to Run Docker CLI Plugins with Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Docker CLI plugins
- Docker Compose
- Docker Buildx
- Podman Compose
- Podman REST API socket
- Trivy
- Grype

## Sources Consulted
- Podman `podman compose` documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Podman `podman manifest` documentation: https://docs.podman.io/en/v4.9.0/markdown/podman-manifest.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Docker Build multi-platform documentation: https://docs.docker.com/build/building/multi-platform/
- Docker Buildx CLI reference: https://docs.docker.com/reference/cli/docker/buildx/
- Docker Scout CLI reference: https://docs.docker.com/reference/cli/docker/scout/
- Trivy RPM repository documentation: https://aquasecurity.github.io/trivy-repo/
- Grype installation documentation: https://oss.anchore.com/docs/installation/grype/

## Issues Found
- The Podman multi-platform build example used `podman build --platform linux/amd64,linux/arm64 -t myapp:latest .`. Podman documentation states that when more than one platform is specified, `--manifest` should be used instead of `--tag`. Changed the example to `podman build --platform linux/amd64,linux/arm64 --manifest myapp:latest .`.
- The wrapper's fallback message implied unsupported Buildx subcommands could safely be mapped to `podman build`. Changed the message to state that the wrapper does not fully support advanced Buildx workflows and points users to `podman build` or `podman manifest` directly.
- The Trivy `dnf install` example did not include the required RPM repository setup from the official Trivy installation documentation. Added the repository configuration before `sudo dnf install -y trivy`.
- The Grype install example used the older raw GitHub install script URL. Updated it to the current official `https://get.anchore.io/grype` install endpoint and included `sudo` for installation into `/usr/local/bin`.

## Review Notes
Podman was not installed in the local environment, so Podman commands were verified against official Podman documentation rather than local `--help` output. Docker CLI, Compose, and Buildx were available locally, and their presence matched the plugin-oriented commands discussed in the post.
