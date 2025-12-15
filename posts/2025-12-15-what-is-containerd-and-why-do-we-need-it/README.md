# What is containerd and Why Do We Need It?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Containers, containerd, Docker, Kubernetes, DevOps, Container Runtime

Description: Learn what containerd is, how it differs from Docker, why Kubernetes adopted it as the default runtime, and when you should care about container runtimes.

---

If you've worked with containers, you've almost certainly used Docker. But under the hood, Docker relies on a component called **containerd** to actually run your containers. With Kubernetes deprecating Docker as a runtime and adopting containerd directly, understanding this technology has become essential for anyone working with containers in production.

## What is containerd?

**containerd** (pronounced "container-dee") is an industry-standard container runtime that manages the complete container lifecycle on a host system. It handles:

- Pulling and storing container images
- Creating and running containers
- Managing container networking (via CNI plugins)
- Supervising container processes
- Managing snapshots and storage

containerd was originally built as a core component of Docker, then donated to the Cloud Native Computing Foundation (CNCF) in 2017. Today it's a graduated CNCF project used by Docker, Kubernetes, and many other platforms.

```
┌─────────────────────────────────────────────────────────┐
│                     Your Application                     │
├─────────────────────────────────────────────────────────┤
│              Kubernetes / Docker CLI                     │
├─────────────────────────────────────────────────────────┤
│                      containerd                          │
├─────────────────────────────────────────────────────────┤
│                        runc                              │
├─────────────────────────────────────────────────────────┤
│                    Linux Kernel                          │
│            (namespaces, cgroups, etc.)                   │
└─────────────────────────────────────────────────────────┘
```

## The Container Runtime Stack

To understand containerd, you need to understand the container runtime hierarchy:

### High-Level Runtimes (Container Engines)

These provide user-friendly interfaces for building, running, and managing containers:

- **Docker Engine** - The original, includes CLI, API, image building
- **Podman** - Daemonless alternative to Docker
- **nerdctl** - Docker-compatible CLI for containerd

### Low-Level Runtimes (Container Runtimes)

These actually create and run containers by interfacing with the kernel:

- **containerd** - Manages container lifecycle, images, and storage
- **CRI-O** - Lightweight runtime built specifically for Kubernetes

### OCI Runtimes

The lowest level - these spawn the actual container process:

- **runc** - Reference implementation, used by containerd and CRI-O
- **crun** - Faster, written in C
- **gVisor (runsc)** - Sandboxed containers for extra isolation
- **Kata Containers** - Lightweight VMs as containers

**containerd sits in the middle** - it's sophisticated enough to manage images and containers, but lightweight enough to be embedded in larger systems.

## containerd vs Docker: What's the Difference?

Docker Engine is built on top of containerd. When you run `docker run`, here's what happens:

```
docker run nginx
    │
    ▼
Docker CLI → Docker Daemon (dockerd)
                    │
                    ▼
              containerd
                    │
                    ▼
                  runc
                    │
                    ▼
            Container Process
```

**Docker includes:**
- CLI (`docker` command)
- Docker Daemon (`dockerd`)
- Image building (`docker build`)
- Docker Compose
- Docker Swarm
- containerd (embedded)

**containerd alone provides:**
- Image pull/push
- Container creation/execution
- Snapshot management
- Network namespace setup (via CNI)
- No build functionality (need BuildKit separately)
- No CLI (need `ctr` or `nerdctl`)

### When to use each

| Use Case | Recommended |
|----------|-------------|
| Local development | Docker Desktop |
| Building images | Docker or BuildKit |
| Kubernetes nodes | containerd directly |
| Minimal footprint | containerd |
| Full-featured CLI | Docker or Podman |

## Why Kubernetes Switched to containerd

In Kubernetes 1.20, Docker was deprecated as a container runtime. By 1.24, the dockershim was removed entirely. Here's why:

### The Problem with Docker in Kubernetes

Kubernetes communicates with container runtimes via the **Container Runtime Interface (CRI)**. Docker predates CRI and doesn't implement it natively.

The old architecture required a shim:

```
kubelet → dockershim → Docker → containerd → runc
```

This added:
- Extra layers of abstraction
- More points of failure
- Additional resource overhead
- Maintenance burden for the Kubernetes team

### The containerd Solution

containerd implements CRI natively:

```
kubelet → containerd → runc
```

**Benefits:**
- Fewer moving parts
- Lower resource usage (~20% less memory)
- Faster container operations
- Direct CRI implementation
- Better maintained (CNCF project)

### What This Means for You

**Your Docker images still work.** Both Docker and containerd use the same OCI image format. Any image you built with Docker runs on containerd without changes.

**Your Dockerfiles still work.** You can build with Docker locally and deploy to Kubernetes clusters running containerd.

**You might not notice the difference.** If you're deploying to managed Kubernetes (EKS, GKE, AKS), the switch already happened.

## Installing containerd

### On Ubuntu/Debian

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key (containerd is distributed via Docker's repo)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install containerd
sudo apt-get update
sudo apt-get install -y containerd.io

# Generate default config
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable and start
sudo systemctl enable containerd
sudo systemctl start containerd
```

### On RHEL/CentOS/Fedora

```bash
# Add Docker repo
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install containerd
sudo dnf install -y containerd.io

# Generate default config
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable and start
sudo systemctl enable containerd
sudo systemctl start containerd
```

## Configuring containerd for Kubernetes

For Kubernetes, you need to enable the CRI plugin and configure the cgroup driver.

Edit `/etc/containerd/config.toml`:

```toml
version = 2

[plugins]
  [plugins."io.containerd.grpc.v1.cri"]
    sandbox_image = "registry.k8s.io/pause:3.9"
    [plugins."io.containerd.grpc.v1.cri".containerd]
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          runtime_type = "io.containerd.runc.v2"
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            SystemdCgroup = true
```

Key settings:

- **SystemdCgroup = true**: Use systemd cgroup driver (matches kubelet default)
- **sandbox_image**: The pause container image for pod networking

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Using containerd Directly

### With ctr (Low-Level CLI)

`ctr` is the built-in CLI for containerd. It's functional but not user-friendly:

```bash
# Pull an image
sudo ctr images pull docker.io/library/nginx:latest

# List images
sudo ctr images list

# Run a container
sudo ctr run --rm -t docker.io/library/nginx:latest nginx-test

# List containers
sudo ctr containers list

# List running tasks
sudo ctr tasks list
```

### With nerdctl (Docker-Compatible CLI)

`nerdctl` provides a Docker-like experience for containerd:

```bash
# Install nerdctl
wget https://github.com/containerd/nerdctl/releases/download/v1.7.0/nerdctl-1.7.0-linux-amd64.tar.gz
sudo tar -xzf nerdctl-1.7.0-linux-amd64.tar.gz -C /usr/local/bin

# Now use Docker-like commands
nerdctl run -d --name nginx -p 8080:80 nginx
nerdctl ps
nerdctl logs nginx
nerdctl exec -it nginx sh
nerdctl stop nginx
nerdctl rm nginx
```

nerdctl also supports:
- Docker Compose files (`nerdctl compose up`)
- Image building (`nerdctl build`)
- Most Docker CLI flags

## containerd Namespaces

containerd uses namespaces to isolate different clients. This is different from Linux kernel namespaces - it's a containerd-specific concept for multi-tenancy.

```bash
# List namespaces
sudo ctr namespaces list

# Kubernetes uses the "k8s.io" namespace
sudo ctr -n k8s.io containers list

# Docker uses the "moby" namespace
sudo ctr -n moby containers list

# Default namespace is "default"
sudo ctr -n default images list
```

When troubleshooting Kubernetes, always specify the namespace:

```bash
sudo ctr -n k8s.io images list
sudo ctr -n k8s.io containers list
```

## containerd vs CRI-O

Both are CRI-compliant runtimes for Kubernetes. How do they compare?

| Feature | containerd | CRI-O |
|---------|------------|-------|
| Scope | General-purpose | Kubernetes-only |
| Image building | Via BuildKit | No |
| Docker compatibility | High (same images) | High (same images) |
| Used by | Docker, Kubernetes, others | Kubernetes, OpenShift |
| CNCF status | Graduated | Incubating |
| Footprint | Slightly larger | Minimal |

**Choose containerd if:**
- You want one runtime for Kubernetes and other uses
- You need Docker compatibility
- You're using a managed Kubernetes service (most use containerd)

**Choose CRI-O if:**
- You want the absolute minimum for Kubernetes
- You're running OpenShift
- You want tight coupling with Kubernetes release cycles

## Troubleshooting containerd

### Check containerd status

```bash
sudo systemctl status containerd
sudo journalctl -u containerd -f
```

### Verify CRI is working

```bash
# Using crictl (CRI CLI)
sudo crictl info
sudo crictl images
sudo crictl ps
```

### Common issues

**Container won't start:**
```bash
# Check container logs
sudo ctr -n k8s.io tasks list
sudo ctr -n k8s.io tasks logs <container-id>
```

**Image pull failures:**
```bash
# Test pull manually
sudo ctr images pull docker.io/library/nginx:latest

# Check registry configuration in /etc/containerd/config.toml
```

**Cgroup driver mismatch:**
```bash
# Ensure containerd and kubelet use the same cgroup driver
# In containerd config: SystemdCgroup = true
# In kubelet config: --cgroup-driver=systemd
```

## Best Practices

1. **Use systemd cgroup driver** for Kubernetes deployments
2. **Configure image garbage collection** to prevent disk exhaustion
3. **Set resource limits** in containerd config for production
4. **Use nerdctl** for human-friendly CLI interactions
5. **Monitor containerd metrics** via the `/metrics` endpoint
6. **Keep containerd updated** - security patches matter

### Enabling Metrics

```toml
# In /etc/containerd/config.toml
[metrics]
  address = "127.0.0.1:1338"
```

Scrape with Prometheus:
```yaml
- job_name: 'containerd'
  static_configs:
    - targets: ['localhost:1338']
```

## TL;DR

- **containerd** is the container runtime that actually runs your containers
- **Docker uses containerd** internally - they're not competitors
- **Kubernetes switched to containerd** directly for efficiency (removing the Docker middleman)
- **Your images work everywhere** - Docker, containerd, and CRI-O all use OCI images
- **For Kubernetes nodes**, containerd is the default and recommended runtime
- **For local development**, Docker Desktop (which uses containerd) remains convenient

---

**Related Reading:**

- [How Docker Actually Works](https://oneuptime.com/blog/post/2025-12-08-how-docker-actually-works/view)
- [Building Your Own Container Engine in Go](https://oneuptime.com/blog/post/2025-12-09-building-docker-from-scratch/view)
- [Learn Docker Step by Step](https://oneuptime.com/blog/post/2025-11-27-learn-docker-step-by-step/view)
