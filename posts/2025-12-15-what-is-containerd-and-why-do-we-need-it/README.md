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

This script installs containerd from Docker's official repository, which provides the most up-to-date and stable version. The installation includes setting up GPG keys for package verification and generating the default configuration file.

```bash
# Install prerequisites for adding external repositories
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key for package signature verification
# containerd is distributed through Docker's repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg    # Make key readable by apt

# Add the Docker repository to apt sources
# Uses dpkg to detect architecture (amd64, arm64, etc.)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install containerd from the newly added repository
sudo apt-get update
sudo apt-get install -y containerd.io

# Generate the default containerd configuration file
# This creates a baseline config that you can customize
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable containerd to start on boot and start it now
sudo systemctl enable containerd
sudo systemctl start containerd
```

### On RHEL/CentOS/Fedora

For Red Hat-based systems, containerd is also available through Docker's repository. The dnf package manager handles dependency resolution automatically.

```bash
# Add Docker's repository for CentOS/RHEL systems
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install containerd package
sudo dnf install -y containerd.io

# Create config directory and generate default configuration
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable containerd service and start it
sudo systemctl enable containerd    # Start on boot
sudo systemctl start containerd     # Start immediately
```

## Configuring containerd for Kubernetes

For Kubernetes, you need to enable the CRI plugin and configure the cgroup driver. The cgroup driver must match between containerd and kubelet to avoid resource management issues.

Edit `/etc/containerd/config.toml`:

```toml
# Config file format version
version = 2

[plugins]
  # CRI plugin configuration - enables Kubernetes integration
  [plugins."io.containerd.grpc.v1.cri"]
    # The pause container creates the pod's network namespace
    sandbox_image = "registry.k8s.io/pause:3.9"
    [plugins."io.containerd.grpc.v1.cri".containerd]
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
        # Configure runc as the OCI runtime
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          runtime_type = "io.containerd.runc.v2"
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            # CRITICAL: Use systemd cgroup driver to match kubelet
            # Mismatched cgroup drivers cause pod failures
            SystemdCgroup = true
```

Key settings:

- **SystemdCgroup = true**: Use systemd cgroup driver (matches kubelet default)
- **sandbox_image**: The pause container image for pod networking

After modifying the configuration, restart containerd to apply changes:

```bash
# Restart containerd to load new configuration
sudo systemctl restart containerd
```

## Using containerd Directly

### With ctr (Low-Level CLI)

`ctr` is the built-in CLI for containerd. It is functional but not user-friendly - designed more for debugging and testing than daily use. Understanding `ctr` helps when troubleshooting containerd issues.

```bash
# Pull an image from Docker Hub (requires full image reference)
sudo ctr images pull docker.io/library/nginx:latest

# List all images stored in containerd
sudo ctr images list

# Run a container interactively and remove it on exit
# --rm removes container after exit, -t allocates a TTY
sudo ctr run --rm -t docker.io/library/nginx:latest nginx-test

# List all containers (both running and stopped)
sudo ctr containers list

# List running tasks (actual processes)
# Tasks are the running instances of containers
sudo ctr tasks list
```

### With nerdctl (Docker-Compatible CLI)

`nerdctl` provides a Docker-like experience for containerd, making migration from Docker seamless. It supports most Docker CLI flags and even Docker Compose files.

```bash
# Download and install nerdctl binary
wget https://github.com/containerd/nerdctl/releases/download/v1.7.0/nerdctl-1.7.0-linux-amd64.tar.gz
# Extract to /usr/local/bin for system-wide access
sudo tar -xzf nerdctl-1.7.0-linux-amd64.tar.gz -C /usr/local/bin

# Now use familiar Docker-like commands
# -d runs detached, --name sets container name, -p maps ports
nerdctl run -d --name nginx -p 8080:80 nginx
# List running containers
nerdctl ps
# View container logs
nerdctl logs nginx
# Execute interactive shell inside the container
nerdctl exec -it nginx sh
# Stop the running container
nerdctl stop nginx
# Remove the stopped container
nerdctl rm nginx
```

nerdctl also supports:
- Docker Compose files (`nerdctl compose up`)
- Image building (`nerdctl build`)
- Most Docker CLI flags

## containerd Namespaces

containerd uses namespaces to isolate different clients. This is different from Linux kernel namespaces - it is a containerd-specific concept for multi-tenancy that allows multiple systems (Docker, Kubernetes, etc.) to share a single containerd instance without conflicts.

```bash
# List all containerd namespaces
sudo ctr namespaces list

# Kubernetes stores containers in the "k8s.io" namespace
# Use -n flag to specify which namespace to query
sudo ctr -n k8s.io containers list

# Docker uses the "moby" namespace when running on containerd
sudo ctr -n moby containers list

# Manual ctr commands use "default" namespace by default
sudo ctr -n default images list
```

When troubleshooting Kubernetes, always specify the namespace to see the right containers and images:

```bash
# View images available to Kubernetes
sudo ctr -n k8s.io images list
# View Kubernetes containers (pods are multiple containers)
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

These commands help verify containerd is running and identify startup issues from the systemd journal.

```bash
# Check if containerd service is running and healthy
sudo systemctl status containerd
# Follow containerd logs in real-time for debugging
sudo journalctl -u containerd -f
```

### Verify CRI is working

The `crictl` command is the standard tool for interacting with CRI-compliant runtimes. It is essential for Kubernetes troubleshooting.

```bash
# Using crictl (CRI CLI) - shows runtime info and version
sudo crictl info
# List images available to Kubernetes
sudo crictl images
# List running containers (similar to docker ps)
sudo crictl ps
```

### Common issues

**Container won't start:**

When a container fails to start, check the task status and logs to identify the root cause.

```bash
# List tasks to see container states (running, stopped, etc.)
sudo ctr -n k8s.io tasks list
# View container output - replace <container-id> with actual ID
sudo ctr -n k8s.io tasks logs <container-id>
```

**Image pull failures:**

Image pull issues are often due to network, authentication, or registry configuration problems.

```bash
# Test pull manually to see detailed error messages
sudo ctr images pull docker.io/library/nginx:latest

# Check registry configuration in /etc/containerd/config.toml
# Look for [plugins."io.containerd.grpc.v1.cri".registry] section
```

**Cgroup driver mismatch:**

Cgroup driver mismatches between containerd and kubelet cause pods to fail. Both must use the same driver.

```bash
# Ensure containerd and kubelet use the same cgroup driver
# In containerd config: SystemdCgroup = true
# In kubelet config: --cgroup-driver=systemd
# After fixing, restart both services
```

## Best Practices

1. **Use systemd cgroup driver** for Kubernetes deployments
2. **Configure image garbage collection** to prevent disk exhaustion
3. **Set resource limits** in containerd config for production
4. **Use nerdctl** for human-friendly CLI interactions
5. **Monitor containerd metrics** via the `/metrics` endpoint
6. **Keep containerd updated** - security patches matter

### Enabling Metrics

containerd exposes Prometheus-compatible metrics that provide insights into container operations, image pulls, and runtime performance.

```toml
# Add this section to /etc/containerd/config.toml
[metrics]
  # Bind metrics endpoint to localhost only for security
  # Use 0.0.0.0:1338 to expose externally (not recommended)
  address = "127.0.0.1:1338"
```

Configure Prometheus to scrape containerd metrics. This enables monitoring of container runtime performance alongside your applications.

```yaml
# Add to prometheus.yml scrape_configs
- job_name: 'containerd'
  static_configs:
    # Point to containerd metrics endpoint
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
