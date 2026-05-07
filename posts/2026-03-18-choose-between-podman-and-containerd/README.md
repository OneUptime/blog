# How to Choose Between Podman and containerd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerd, Container, Kubernetes, Container Runtime

Description: Compare Podman and containerd as container runtimes to understand their architectures, use cases, and how each fits into container orchestration and standalone deployment scenarios.

---

> Podman and containerd serve different roles in the container ecosystem. Podman is a complete container management tool for end users, while containerd is a low-level runtime designed to be embedded in larger systems like Kubernetes.

Podman and containerd are both container runtimes, but they target different users and use cases. Understanding their architectural differences helps you choose the right tool based on whether you need a standalone container manager or a runtime for an orchestration platform.

This guide provides a detailed comparison of both runtimes across architecture, features, and deployment scenarios.

---

## Architectural Overview

Podman is a user-facing tool that handles the full container lifecycle: pulling images, building containers, running them, and managing networks and volumes. It operates without a central daemon, using `conmon` to monitor container processes.

containerd is a daemon-based runtime that provides a core set of container operations. It is designed to be embedded in higher-level systems. Docker uses containerd as its runtime backend, and many Kubernetes distributions use it as their container runtime through the CRI (Container Runtime Interface).

```text
Podman architecture:
  User → podman CLI → conmon → crun/runc → container

containerd architecture:
  User → ctr/nerdctl → containerd daemon → runc → container
  Kubernetes → CRI → containerd daemon → runc → container
```

## Daemon vs Daemonless

containerd runs as a system daemon that must be started and running before any container operations can happen:

```bash
# containerd requires a running daemon

sudo systemctl start containerd
sudo ctr images pull docker.io/library/nginx:latest
sudo ctr run docker.io/library/nginx:latest web
```

Podman requires no daemon:

```bash
# Podman runs directly
podman pull docker.io/library/nginx:latest
podman run -d --name web nginx
```

## User Interface

containerd provides a minimal CLI tool called `ctr` that exposes low-level operations:

```bash
# containerd with ctr (low-level)
sudo ctr images pull docker.io/library/nginx:latest
sudo ctr run -d docker.io/library/nginx:latest web
sudo ctr containers ls
sudo ctr tasks ls

# containerd with nerdctl (Docker-compatible CLI)
sudo nerdctl run -d --name web -p 8080:80 nginx
sudo nerdctl ps
sudo nerdctl logs web
```

Podman provides a full-featured CLI that mirrors Docker:

```bash
# Podman (Docker-compatible CLI)
podman run -d --name web -p 8080:80 nginx
podman ps
podman logs web
podman exec -it web bash
```

## Rootless Support

Podman was designed for rootless operation from the start:

```bash
# Podman rootless: works out of the box
podman run -d --name web nginx

# Verify running as regular user
podman inspect web --format '{{.HostConfig.UsernsMode}}'
```

containerd supports rootless mode through rootlesskit, but it requires additional setup:

```bash
# containerd rootless requires setup
containerd-rootless-setuptool.sh install
containerd-rootless-setuptool.sh install-buildkit

# Then use nerdctl with rootless containerd
nerdctl run -d --name web nginx
```

## Image Management

Both runtimes work with OCI-compliant images, but Podman provides richer image management:

```bash
# Podman image management
podman pull nginx
podman images
podman image inspect nginx
podman image prune
podman build -t myapp .
podman push myapp registry.example.com/myapp

# containerd image management (with ctr)
sudo ctr images pull docker.io/library/nginx:latest
sudo ctr images ls
sudo ctr images rm docker.io/library/nginx:latest
# Building requires BuildKit as a separate tool
```

## Kubernetes Integration

containerd is the default runtime for most Kubernetes distributions:

```toml
# Kubernetes node configuration with containerd 1.x
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "registry.k8s.io/pause:3.9"

[plugins."io.containerd.grpc.v1.cri".containerd]
  default_runtime_name = "runc"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true
```

Podman does not serve as a Kubernetes node runtime, but it can generate and consume Kubernetes YAML:

```bash
# Podman Kubernetes integration
podman kube generate myapp > myapp.yaml
podman kube play myapp.yaml
podman kube play --down myapp.yaml
```

## Networking

Podman provides CNI and Netavark networking with full DNS resolution:

```bash
podman network create mynet
podman run -d --network mynet --name web nginx
podman run -d --network mynet --name api my-api
# api can reach web at hostname "web"
```

containerd delegates networking to plugins and is typically configured through the orchestrator:

```bash
# containerd with nerdctl
nerdctl network create mynet
nerdctl run -d --network mynet --name web nginx
```

## Storage

Podman supports multiple storage drivers and named volumes:

```bash
podman volume create mydata
podman run -d -v mydata:/data:Z nginx
podman volume inspect mydata
```

containerd uses snapshotter-based storage:

```bash
# containerd storage is managed through its API
# Direct volume management requires nerdctl
nerdctl volume create mydata
nerdctl run -d -v mydata:/data nginx
```

## Pod Support

Podman supports Kubernetes-style pods natively:

```bash
podman pod create --name myapp -p 8080:80
podman run -d --pod myapp --name web nginx
podman run -d --pod myapp --name api my-api
```

containerd does not provide a Podman-style pod workflow at the CLI level. Kubernetes pods are managed through the CRI interface.

## When to Choose Podman

- You need a standalone container management tool
- You want rootless containers without additional setup
- You are running containers on a single server or workstation
- You need pod support without Kubernetes
- You want systemd integration through Quadlet
- You prefer a daemonless architecture
- You are developing on RHEL, CentOS, or Fedora

## When to Choose containerd

- You are running a Kubernetes cluster and need a CRI-compatible runtime
- You are building a platform that embeds a container runtime
- You need a lightweight runtime focused on container execution
- Your orchestrator (Kubernetes, Nomad) manages the container lifecycle
- You want the default runtime that most Kubernetes distributions use

## Using Both Together

In many environments, Podman and containerd serve complementary roles:

```bash
# Development: Use Podman for local container management
podman build -t myapp .
podman run -d myapp

# Production Kubernetes: containerd as the node runtime
# Podman is not involved in the Kubernetes runtime path
kubectl apply -f deployment.yaml
# Kubernetes → CRI → containerd → runc → container
```

## Conclusion

Podman and containerd serve different purposes in the container ecosystem. Podman is a complete, user-facing tool for building, running, and managing containers without a daemon. containerd is a runtime daemon designed to be embedded in orchestration platforms like Kubernetes. Most teams use Podman for development and standalone deployments, and containerd as the production Kubernetes runtime. The choice depends on whether you need a standalone container manager or a runtime for an orchestration platform.
