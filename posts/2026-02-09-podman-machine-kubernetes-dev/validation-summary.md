# Validation Summary: How to Set Up Podman Machine as a Container Runtime Alternative

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Podman Desktop Docker compatibility
- Docker Desktop licensing and privileged helpers
- Kind
- Minikube
- Kubernetes
- CRI-O
- containerd registry configuration
- Dockerfile multi-stage builds
- Go
- Alpine Linux

## Sources Consulted
- Docker Desktop license agreement: https://docs.docker.com/subscription/desktop-license/
- Docker Desktop Mac permission requirements: https://docs.docker.com/desktop/setup/install/mac-permission-requirements/
- Podman Machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman Machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman Machine set documentation: https://docs.podman.io/en/latest/markdown/podman-machine-set.1.html
- Podman system service and socket documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman rootless mode documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman top documentation: https://docs.podman.io/en/latest/markdown/podman-top.1.html
- Podman Desktop Docker compatibility documentation: https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility
- Podman Desktop DOCKER_HOST documentation: https://podman-desktop.io/docs/migrating-from-docker/using-the-docker_host-environment-variable
- Kind rootless provider documentation: https://kind.sigs.k8s.io/docs/user/rootless/
- Kind local registry documentation: https://kind.sigs.k8s.io/docs/user/local-registry/
- Kind homepage / current install guidance: https://kind.sigs.k8s.io/
- Minikube Podman driver documentation: https://minikube.sigs.k8s.io/docs/drivers/podman/
- Minikube start command documentation: https://minikube.sigs.k8s.io/docs/commands/start/
- Kubernetes releases page: https://kubernetes.io/releases/
- Go release history: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The Docker Desktop licensing claim was too broad. Docker Desktop requires a paid subscription for commercial use only beyond Docker's free tier limits, so the introduction now says "commercial use in larger organizations."
- The Docker Desktop privilege claim was too broad. Docker Desktop uses privileged helper processes for specific host integration features, so the wording now reflects that narrower behavior.
- The installation wording said "Install Podman Desktop" but used `brew install podman`, which installs the Podman CLI. The text now distinguishes Podman CLI from Podman Desktop.
- The Linux rootless setup did not configure subordinate UID/GID mappings. Added `uidmap` and `usermod --add-subuids/--add-subgids`, then kept `podman system migrate` as the step that applies rootless configuration changes.
- The Linux `DOCKER_HOST` example hard-coded `/run/user/$(id -u)` and the macOS path was missing. It now uses `${XDG_RUNTIME_DIR}` for Linux and shows how to obtain the Podman Machine socket path on macOS.
- The Kind install command used old `v0.20.0`. Updated it to `v0.32.0` based on current Kind install guidance.
- Several Kind commands omitted `KIND_EXPERIMENTAL_PROVIDER=podman`, which can make them target Docker instead of Podman. Added the provider variable to image loading and troubleshooting commands.
- The Minikube section combined rootless Podman with `--container-runtime=cri-o`, but the official Minikube Podman driver docs recommend CRI-O except when using rootless Podman. Updated the examples to set `minikube config set rootless true` and start with the Podman driver.
- The Minikube resource example pinned Kubernetes `v1.28.0`, which is no longer supported. Replaced it with `--kubernetes-version=stable`.
- The Dockerfile used outdated base images (`golang:1.21-alpine` and `alpine:3.18`). Updated them to `golang:1.26-alpine` and `alpine:3.23`.
- The Kind local registry configuration used an older containerd mirror patch and did not connect the registry to the Kind network. Replaced it with the current `config_path` / `hosts.toml` pattern and added `podman network connect kind kind-registry`.
- The resource monitoring command `podman machine ssh podman top` was invalid because `podman top` requires a container argument. Replaced it with `podman machine ssh top`.
- The Podman Machine log command used an imprecise system unit name. Updated it to inspect the user `podman.socket` and `podman.service` units.
- The socket troubleshooting command `ls -la $DOCKER_HOST` would fail because `DOCKER_HOST` includes the `unix://` scheme. Changed it to strip the scheme before calling `ls`.

## Review Notes
The post is now technically valid as a rootless Podman-focused workflow. Some commands are still Linux x86-64 specific, such as the Kind and Minikube binary downloads, so future improvements could add macOS, Windows, and ARM64 installation variants.
