# How to Choose Between Podman and nerdctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, nerdctl, Containerd, Container, CLI

Description: Compare Podman and nerdctl as Docker-compatible container CLI tools, examining their architecture, features, and how they integrate with different container runtimes.

---

> Podman and nerdctl both provide Docker-compatible CLI experiences but run on different container runtimes. Podman uses its own stack with conmon and crun, while nerdctl is a frontend for containerd.

Podman and nerdctl are both alternatives to the Docker CLI. They provide familiar commands for pulling images, running containers, and managing networks. However, they use different underlying runtimes and offer different feature sets. Choosing between them depends on your runtime preference, rootless requirements, and ecosystem integration.

This guide compares both tools to help you decide which fits your workflow.

---

## Architecture

Podman is a standalone tool with its own container management stack:

```text
podman CLI → conmon (container monitor) → crun/runc → container
```

nerdctl is a CLI frontend for the containerd daemon:

```text
nerdctl CLI → containerd daemon → runc → container
```

The key difference is that nerdctl requires the containerd daemon to be running, while Podman operates without any daemon.

## Installation

Podman is available through system package managers:

```bash
# Fedora/RHEL

sudo dnf install podman

# Ubuntu/Debian
sudo apt install podman

# macOS
brew install podman
podman machine init
podman machine start
```

nerdctl can be installed standalone or with its full dependencies:

```bash
# Install nerdctl with containerd (full bundle)
wget https://github.com/containerd/nerdctl/releases/download/v2.3.0/nerdctl-full-2.3.0-linux-amd64.tar.gz
sudo tar -xzf nerdctl-full-2.3.0-linux-amd64.tar.gz -C /usr/local

# Install nerdctl only (requires containerd separately)
wget https://github.com/containerd/nerdctl/releases/download/v2.3.0/nerdctl-2.3.0-linux-amd64.tar.gz
sudo tar -xzf nerdctl-2.3.0-linux-amd64.tar.gz -C /usr/local/bin

# Start containerd
sudo systemctl start containerd
```

## CLI Compatibility

Both tools aim for Docker CLI compatibility:

```bash
# These commands work in both Podman and nerdctl
podman run -d --name web -p 8080:80 nginx
nerdctl run -d --name web -p 8080:80 nginx

podman ps
nerdctl ps

podman logs web
nerdctl logs web

podman exec -it web bash
nerdctl exec -it web bash

podman build -t myapp .
nerdctl build -t myapp .

podman stop web && podman rm web
nerdctl stop web && nerdctl rm web
```

## Rootless Support

Podman runs rootless when invoked as a regular user, assuming the usual distribution packages and subordinate UID/GID mappings are in place:

```bash
# Podman: rootless out of the box
podman run -d --name web nginx
podman ps  # Running as your regular user
```

nerdctl supports rootless mode through rootlesskit, but requires explicit setup:

```bash
# nerdctl rootless setup
containerd-rootless-setuptool.sh install

# Run rootless containers
nerdctl run -d --name web nginx
```

Podman's rootless implementation is mature and well tested across distributions, and packaged installations usually include the needed rootless dependencies.

## Compose Support

Both tools support compose files:

```bash
# Podman with podman-compose
pip install podman-compose
podman-compose up -d

# nerdctl with built-in compose
nerdctl compose up -d
```

nerdctl has built-in compose support that is fairly compatible with Docker Compose files. Podman uses the separate podman-compose tool or Docker Compose through the Podman socket.

## Pod Support

Podman has native pod support:

```bash
# Podman pods
podman pod create --name myapp -p 8080:80
podman run -d --pod myapp --name web nginx
podman run -d --pod myapp --name api my-api
podman pod ps
```

nerdctl does not have native pod support. Pods are managed by Kubernetes through the CRI when using containerd as the Kubernetes runtime.

## Image Building

Podman uses Buildah for image building:

```bash
# Podman build
podman build -t myapp .
podman build --layers --cache-from=registry.example.com/myapp:cache -t myapp .
```

nerdctl uses BuildKit, which provides advanced caching and build features:

```bash
# nerdctl build with BuildKit
nerdctl build -t myapp .
nerdctl build --cache-from type=registry,ref=myapp:cache -t myapp .

# BuildKit advanced features
nerdctl build --output type=local,dest=./output .
nerdctl build --platform linux/amd64,linux/arm64 -t myapp .
```

BuildKit generally provides faster builds through better caching and parallelization.

## Networking

Both tools support creating custom networks:

```bash
# Podman networking
podman network create mynet
podman run -d --network mynet --name web nginx
podman network inspect mynet

# nerdctl networking
nerdctl network create mynet
nerdctl run -d --network mynet --name web nginx
nerdctl network inspect mynet
```

Podman supports both CNI and Netavark network backends. nerdctl uses CNI plugins that ship with the full bundle.

## systemd Integration

Podman integrates deeply with systemd through Quadlet:

```ini
# Podman Quadlet
# ~/.config/containers/systemd/web.container
[Container]
Image=docker.io/library/nginx:stable
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

nerdctl does not have native systemd integration. You would write custom systemd unit files:

```ini
# Custom systemd unit for nerdctl
[Unit]
Description=Nginx container
After=containerd.service

[Service]
ExecStartPre=-/usr/local/bin/nerdctl rm -f web
ExecStart=/usr/local/bin/nerdctl run --name web -p 8080:80 docker.io/library/nginx:stable
ExecStop=/usr/local/bin/nerdctl stop web
Restart=always

[Install]
WantedBy=multi-user.target
```

## Auto-Update

Podman supports automatic container image updates:

```bash
podman run -d --label io.containers.autoupdate=registry --name web docker.io/library/nginx:stable
podman auto-update
```

nerdctl does not have built-in auto-update functionality.

## Kubernetes Integration

nerdctl shares its runtime (containerd) with Kubernetes, which makes it natural for testing and debugging on Kubernetes nodes:

```bash
# On a Kubernetes node, nerdctl can inspect containerd containers
sudo nerdctl --namespace k8s.io ps
sudo nerdctl --namespace k8s.io logs <container-id>
```

Podman generates and consumes Kubernetes YAML:

```bash
podman kube generate myapp > deployment.yaml
podman kube play deployment.yaml
```

## Performance

Both tools have similar container runtime performance since they both ultimately use runc or crun. The differences are in CLI startup time and image operations:

```bash
# Podman: no daemon overhead, but each command is a new process
time podman ps  # Includes process startup

# nerdctl: daemon handles operations, CLI is a thin client
time nerdctl ps  # Client connects to running daemon
```

For frequent CLI operations, nerdctl may be slightly faster because containerd caches state. For idle resource usage, Podman is lighter because there is no daemon process.

## When to Choose Podman

- You want rootless containers with minimal setup on most packaged Linux distributions
- You need native pod support
- You want deep systemd integration with Quadlet
- You prefer a daemonless architecture
- You are on RHEL, Fedora, or CentOS
- You want auto-update support
- You need Kubernetes YAML generation

## When to Choose nerdctl

- You use containerd as your container runtime
- You need BuildKit's advanced build features
- You want built-in compose support without additional tools
- You work on Kubernetes nodes and want to inspect containerd containers
- You prefer containerd's snapshot-based storage model
- You want a lighter CLI that delegates to an existing daemon

## Conclusion

Podman and nerdctl are both capable Docker alternatives with different strengths. Podman offers a more complete standalone experience with rootless defaults, pod support, and systemd integration. nerdctl provides a Docker-compatible interface to containerd with strong build tooling through BuildKit. Choose Podman for standalone container management with security-first defaults, and nerdctl when you are already invested in the containerd ecosystem or need BuildKit's advanced features.
