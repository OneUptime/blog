# Validation Summary: How to Run Podman Inside Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Docker
- Nested containers
- Rootless containers
- fuse-overlayfs and VFS storage
- GitLab CI
- GitHub Actions
- Podman Python SDK

## Sources Consulted
- Podman CLI documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- Podman Python SDK documentation: https://podman-py.readthedocs.io/en/stable/
- Podman Python SDK client documentation: https://podman-py.readthedocs.io/en/stable/podman.client.html
- GitHub Actions container job documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container
- GitLab Runner Docker executor documentation: https://docs.gitlab.com/runner/executors/docker/
- Docker run CLI documentation: https://docs.docker.com/reference/cli/docker/container/run
- Docker bind mount documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Fedora python3-podman package information: https://packages.fedoraproject.org/pkgs/python-podman/python3-podman/

## Issues Found
- The post said `--privileged` is required. In practice it is often required for nested Podman because of namespace and mount restrictions, but not every possible setup requires full privileged mode. Changed the wording to "often required".
- The rootless section described the setup as "more secure" while still using Docker `--privileged`. Changed the wording to state the narrower technical benefit: the inner Podman process runs as a non-root user.
- The custom image section said it combined Docker and Podman tooling, but the Dockerfile did not install Docker tooling. Changed the description to build tools and the Podman Python SDK.
- The Dockerfile installed the Podman Python SDK with `pip3 install podman` into the system Python environment. Replaced this with Fedora's `python3-podman` package, which matches the base image family and avoids system Python package-management issues.
- The Python SDK example used `subprocess.run()` to start `podman system service --time=0`, which would block indefinitely. Replaced it with `subprocess.Popen()`, added an explicit Unix socket endpoint, waited for the socket, and connected `PodmanClient` to that endpoint.

## Review Notes
- Podman was not installed in the local workspace, so CLI behavior was checked against official documentation rather than local `podman --help` output.
- The examples still require a Docker runner or host that allows privileged containers and access to `/dev/fuse` where rootless overlay storage is used.
