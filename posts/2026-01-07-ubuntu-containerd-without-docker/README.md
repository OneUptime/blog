# How to Install and Configure containerd on Ubuntu Without Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, containerd, Containers, Kubernetes, Container Runtime

Description: Install and configure containerd on Ubuntu as a standalone container runtime without Docker for Kubernetes and direct container management.

---

## Introduction

containerd is a high-performance, industry-standard container runtime that serves as the foundation for container orchestration platforms like Kubernetes. While Docker has traditionally been the go-to solution for container management, containerd offers a lighter-weight alternative that provides all the essential container runtime capabilities without Docker's additional overhead.

In this comprehensive guide, we will walk through installing and configuring containerd on Ubuntu as a standalone container runtime, bypassing Docker entirely. This approach is particularly valuable for Kubernetes deployments, edge computing scenarios, and environments where resource efficiency is paramount.

## Understanding containerd vs Docker

Before diving into the installation, it is important to understand the relationship between containerd and Docker:

### Docker Architecture

Docker is a complete container platform that includes:
- Docker Engine (dockerd daemon)
- Docker CLI
- containerd (the actual container runtime)
- Docker Compose
- Docker networking and storage drivers

### containerd Architecture

containerd is the core container runtime that Docker itself uses under the hood. It provides:
- Container lifecycle management (create, start, stop, delete)
- Image pulling and management
- Container execution via runc
- Snapshot management for container filesystems
- Network namespace management

### Why Use containerd Without Docker?

There are several compelling reasons to use containerd directly:

1. **Reduced Resource Overhead**: containerd has a smaller memory footprint and fewer running processes
2. **Kubernetes Native**: Kubernetes deprecated Docker shim in favor of CRI-compliant runtimes like containerd
3. **Simpler Architecture**: Fewer abstraction layers mean less complexity and potential failure points
4. **Security**: Smaller attack surface with fewer components
5. **Performance**: Direct container management without Docker daemon overhead

## Prerequisites

Before starting the installation, ensure your Ubuntu system meets these requirements:

```bash
# Check Ubuntu version - containerd works best on Ubuntu 20.04 or later
cat /etc/os-release

# Ensure you have sudo privileges
sudo -v

# Update the system packages to the latest versions
sudo apt update && sudo apt upgrade -y
```

### System Requirements

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- 64-bit system (amd64 or arm64)
- Minimum 2GB RAM (4GB recommended for Kubernetes)
- Root or sudo access
- Internet connectivity for downloading packages

## Method 1: Installing containerd from Ubuntu Repositories

The simplest method is to install containerd from Ubuntu's official repositories.

### Step 1: Install containerd Package

```bash
# Install containerd from the official Ubuntu repositories
# This provides a stable, tested version of containerd
sudo apt update
sudo apt install -y containerd
```

### Step 2: Verify Installation

```bash
# Check the installed version of containerd
containerd --version

# Verify the containerd service is running
sudo systemctl status containerd
```

### Step 3: Enable containerd at Boot

```bash
# Enable containerd to start automatically on system boot
sudo systemctl enable containerd

# Start the containerd service if not already running
sudo systemctl start containerd
```

## Method 2: Installing containerd from Official Binaries

For the latest features and updates, you can install containerd directly from official binaries.

### Step 1: Download containerd Binaries

```bash
# Define the containerd version to install
# Check https://github.com/containerd/containerd/releases for latest version
CONTAINERD_VERSION="1.7.13"

# Download the containerd binary archive for your architecture
wget https://github.com/containerd/containerd/releases/download/v${CONTAINERD_VERSION}/containerd-${CONTAINERD_VERSION}-linux-amd64.tar.gz

# Extract the binaries to /usr/local
# This places containerd and related binaries in /usr/local/bin
sudo tar Cxzvf /usr/local containerd-${CONTAINERD_VERSION}-linux-amd64.tar.gz
```

### Step 2: Install runc

runc is the low-level container runtime that containerd uses to actually run containers.

```bash
# Define the runc version to install
RUNC_VERSION="1.1.12"

# Download the runc binary
wget https://github.com/opencontainers/runc/releases/download/v${RUNC_VERSION}/runc.amd64

# Install runc to /usr/local/sbin with proper permissions
sudo install -m 755 runc.amd64 /usr/local/sbin/runc

# Verify runc installation
runc --version
```

### Step 3: Create systemd Service File

```bash
# Download the official containerd systemd service file
sudo wget https://raw.githubusercontent.com/containerd/containerd/main/containerd.service \
    -O /etc/systemd/system/containerd.service

# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable and start containerd
sudo systemctl enable --now containerd
```

### Step 4: Verify Binary Installation

```bash
# Check containerd is running and accessible
sudo systemctl status containerd

# Verify containerd version
containerd --version

# Test containerd socket connectivity
sudo ctr version
```

## Configuring containerd

containerd uses a TOML configuration file that controls its behavior. Let us create and customize this configuration.

### Generate Default Configuration

```bash
# Create the containerd configuration directory
sudo mkdir -p /etc/containerd

# Generate the default configuration file
# This creates a complete config with all available options
sudo containerd config default | sudo tee /etc/containerd/config.toml
```

### Understanding the Configuration File

The containerd configuration file has several important sections. Let us examine each one:

```toml
# /etc/containerd/config.toml
# Main containerd configuration file

# Version of the configuration file format
version = 2

# Root directory for containerd metadata
# This is where containerd stores container state and metadata
root = "/var/lib/containerd"

# State directory for runtime state
# Contains runtime information like process IDs
state = "/run/containerd"

# Plugin directory for containerd plugins
plugin_dir = ""

# Disabled plugins list
# Uncomment plugins you want to disable
disabled_plugins = []

# Required plugins that must be present
required_plugins = []

# OOM score adjustment for containerd process
# Lower values make containerd less likely to be killed by OOM killer
oom_score = 0

# GRPC configuration for containerd socket
[grpc]
  address = "/run/containerd/containerd.sock"
  tcp_address = ""
  tcp_tls_ca = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216

# Debug configuration for troubleshooting
[debug]
  address = ""
  uid = 0
  gid = 0
  level = ""

# Metrics configuration for Prometheus scraping
[metrics]
  address = ""
  grpc_histogram = false

# Timeouts for various containerd operations
[timeouts]
  "io.containerd.timeout.bolt.open" = "0s"
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"
```

### Configure containerd for Kubernetes CRI

For Kubernetes integration, we need to configure the CRI plugin properly:

```bash
# Edit the containerd configuration for Kubernetes
sudo nano /etc/containerd/config.toml
```

Add or modify the following sections:

```toml
# CRI plugin configuration for Kubernetes integration
[plugins."io.containerd.grpc.v1.cri"]
  # Disable deprecated CRI v1alpha2 API
  disable_tcp_service = true

  # Stream server configuration for kubectl exec/attach
  stream_server_address = "127.0.0.1"
  stream_server_port = "0"
  stream_idle_timeout = "4h0m0s"

  # Enable SELinux labeling if SELinux is enabled
  enable_selinux = false

  # Sandbox image used for Kubernetes pods
  # This is the pause container image
  sandbox_image = "registry.k8s.io/pause:3.9"

  # Maximum container log line size
  max_container_log_line_size = 16384

  # Disable apparmor if not needed
  disable_apparmor = false

  # Containerd configuration for container runtimes
  [plugins."io.containerd.grpc.v1.cri".containerd]
    # Snapshotter to use for container filesystems
    snapshotter = "overlayfs"

    # Default runtime to use
    default_runtime_name = "runc"

    # Disable snapshot annotations
    no_pivot = false

    # runc runtime configuration
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
      runtime_engine = ""
      runtime_root = ""
      privileged_without_host_devices = false
      base_runtime_spec = ""

      # runc options including systemd cgroup driver
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
        # Use systemd cgroup driver - required for Kubernetes
        SystemdCgroup = true
        BinaryName = ""
        Root = ""
        ShimCgroup = ""
        NoPivotRoot = false
        NoNewKeyring = false

  # CNI configuration for container networking
  [plugins."io.containerd.grpc.v1.cri".cni]
    bin_dir = "/opt/cni/bin"
    conf_dir = "/etc/cni/net.d"
    max_conf_num = 1
    conf_template = ""

  # Registry configuration for image pulls
  [plugins."io.containerd.grpc.v1.cri".registry]
    config_path = "/etc/containerd/certs.d"
```

### Apply Configuration Changes

```bash
# Restart containerd to apply configuration changes
sudo systemctl restart containerd

# Verify containerd is running with new configuration
sudo systemctl status containerd

# Check containerd logs for any configuration errors
sudo journalctl -u containerd -n 50 --no-pager
```

## Installing and Configuring CNI Plugins

Container Network Interface (CNI) plugins are essential for container networking. Let us install and configure them.

### Install CNI Plugins

```bash
# Define the CNI plugins version
CNI_VERSION="1.4.0"

# Create the CNI binary directory
sudo mkdir -p /opt/cni/bin

# Download the CNI plugins archive
wget https://github.com/containernetworking/plugins/releases/download/v${CNI_VERSION}/cni-plugins-linux-amd64-v${CNI_VERSION}.tgz

# Extract CNI plugins to the bin directory
sudo tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v${CNI_VERSION}.tgz

# Verify installed plugins
ls -la /opt/cni/bin
```

### Configure CNI Network

```bash
# Create the CNI configuration directory
sudo mkdir -p /etc/cni/net.d
```

Create a basic bridge network configuration:

```bash
# Create a bridge CNI configuration file
# This sets up a simple bridge network for containers
sudo tee /etc/cni/net.d/10-containerd-net.conflist << 'EOF'
{
  "cniVersion": "1.0.0",
  "name": "containerd-net",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "promiscMode": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{
            "subnet": "10.88.0.0/16",
            "gateway": "10.88.0.1"
          }]
        ],
        "routes": [
          { "dst": "0.0.0.0/0" }
        ]
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    },
    {
      "type": "firewall"
    },
    {
      "type": "tuning"
    }
  ]
}
EOF
```

### Enable IP Forwarding

```bash
# Enable IP forwarding for container networking
# This is required for containers to communicate externally
sudo tee /etc/sysctl.d/99-kubernetes-cri.conf << 'EOF'
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

# Load the br_netfilter kernel module
sudo modprobe br_netfilter

# Ensure the module loads at boot
echo "br_netfilter" | sudo tee /etc/modules-load.d/br_netfilter.conf

# Apply sysctl settings immediately
sudo sysctl --system
```

## Using ctr: The containerd CLI

containerd includes `ctr`, a basic command-line tool for interacting with containerd directly.

### Basic ctr Commands

```bash
# Check containerd version and connectivity
sudo ctr version

# List all namespaces
# containerd uses namespaces to isolate containers
sudo ctr namespaces list
```

### Pulling and Managing Images with ctr

```bash
# Pull an image from Docker Hub
# The full image reference is required for ctr
sudo ctr images pull docker.io/library/nginx:latest

# List all downloaded images
sudo ctr images list

# Check image details
sudo ctr images check docker.io/library/nginx:latest

# Export an image to a tar file for offline use
sudo ctr images export nginx.tar docker.io/library/nginx:latest

# Import an image from a tar file
sudo ctr images import nginx.tar

# Remove an image
sudo ctr images remove docker.io/library/nginx:latest
```

### Running Containers with ctr

```bash
# Run a container from the nginx image
# The container name must be unique
sudo ctr run --rm docker.io/library/nginx:latest nginx-test

# Run a container in detached mode
sudo ctr run -d docker.io/library/nginx:latest my-nginx

# List running containers (tasks)
sudo ctr tasks list

# List all containers including stopped ones
sudo ctr containers list

# Execute a command inside a running container
sudo ctr tasks exec --exec-id shell my-nginx /bin/bash

# Stop a running container task
sudo ctr tasks kill my-nginx

# Delete a container
sudo ctr containers delete my-nginx
```

### Using Namespaces

```bash
# Create a new namespace for isolation
sudo ctr namespaces create production

# Run operations in a specific namespace
sudo ctr -n production images pull docker.io/library/alpine:latest

# List images in the production namespace
sudo ctr -n production images list

# The default Kubernetes namespace is k8s.io
sudo ctr -n k8s.io images list
```

## Installing and Using nerdctl

nerdctl is a Docker-compatible CLI for containerd that provides a familiar interface for users coming from Docker.

### Install nerdctl

```bash
# Define the nerdctl version
NERDCTL_VERSION="1.7.3"

# Download nerdctl binary
wget https://github.com/containerd/nerdctl/releases/download/v${NERDCTL_VERSION}/nerdctl-${NERDCTL_VERSION}-linux-amd64.tar.gz

# Extract nerdctl to /usr/local/bin
sudo tar Cxzvf /usr/local/bin nerdctl-${NERDCTL_VERSION}-linux-amd64.tar.gz

# Verify nerdctl installation
nerdctl --version
```

### Install Additional Dependencies for nerdctl

```bash
# Install BuildKit for building container images
# BuildKit is required for 'nerdctl build' command
BUILDKIT_VERSION="0.12.5"

wget https://github.com/moby/buildkit/releases/download/v${BUILDKIT_VERSION}/buildkit-v${BUILDKIT_VERSION}.linux-amd64.tar.gz

# Extract BuildKit binaries
sudo tar Cxzvf /usr/local buildkit-v${BUILDKIT_VERSION}.linux-amd64.tar.gz
```

Create a systemd service for BuildKit:

```bash
# Create BuildKit systemd service file
sudo tee /etc/systemd/system/buildkit.service << 'EOF'
[Unit]
Description=BuildKit
Documentation=https://github.com/moby/buildkit
After=containerd.service

[Service]
Type=notify
ExecStart=/usr/local/bin/buildkitd --oci-worker=false --containerd-worker=true

[Install]
WantedBy=multi-user.target
EOF

# Enable and start BuildKit
sudo systemctl daemon-reload
sudo systemctl enable --now buildkit
```

### Using nerdctl - Docker-Compatible Commands

```bash
# Pull an image (Docker-compatible syntax)
sudo nerdctl pull nginx:latest

# List images
sudo nerdctl images

# Run a container
sudo nerdctl run -d --name my-nginx -p 8080:80 nginx:latest

# List running containers
sudo nerdctl ps

# List all containers including stopped
sudo nerdctl ps -a

# View container logs
sudo nerdctl logs my-nginx

# Execute a command in a running container
sudo nerdctl exec -it my-nginx /bin/bash

# Stop a container
sudo nerdctl stop my-nginx

# Remove a container
sudo nerdctl rm my-nginx

# Remove an image
sudo nerdctl rmi nginx:latest
```

### Building Images with nerdctl

```bash
# Create a simple Dockerfile for testing
cat > Dockerfile << 'EOF'
FROM alpine:latest
RUN apk add --no-cache nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Build an image using BuildKit
sudo nerdctl build -t my-custom-nginx:latest .

# List the newly built image
sudo nerdctl images | grep my-custom-nginx

# Run the custom image
sudo nerdctl run -d --name custom-nginx -p 8081:80 my-custom-nginx:latest
```

### nerdctl Compose Support

nerdctl also supports Docker Compose files:

```bash
# Create a sample compose file
cat > docker-compose.yml << 'EOF'
version: "3.8"
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
  redis:
    image: redis:alpine
EOF

# Start services defined in compose file
sudo nerdctl compose up -d

# List running compose services
sudo nerdctl compose ps

# View logs from compose services
sudo nerdctl compose logs

# Stop and remove compose services
sudo nerdctl compose down
```

## Kubernetes CRI Integration

containerd is the preferred container runtime for Kubernetes. Let us configure it properly for CRI integration.

### Verify CRI Configuration

```bash
# Check that the CRI plugin is enabled in containerd
sudo grep -A 20 'plugins."io.containerd.grpc.v1.cri"' /etc/containerd/config.toml

# Verify the CRI socket is available
ls -la /run/containerd/containerd.sock
```

### Configure Kernel Modules for Kubernetes

```bash
# Load required kernel modules for Kubernetes
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# Load the modules immediately
sudo modprobe overlay
sudo modprobe br_netfilter

# Verify modules are loaded
lsmod | grep -E "overlay|br_netfilter"
```

### Set Up Kubernetes Sysctl Parameters

```bash
# Configure required sysctl parameters for Kubernetes networking
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl parameters without reboot
sudo sysctl --system
```

### Install crictl for CRI Debugging

```bash
# Define crictl version
CRICTL_VERSION="1.29.0"

# Download crictl
wget https://github.com/kubernetes-sigs/cri-tools/releases/download/v${CRICTL_VERSION}/crictl-v${CRICTL_VERSION}-linux-amd64.tar.gz

# Extract to /usr/local/bin
sudo tar Cxzvf /usr/local/bin crictl-v${CRICTL_VERSION}-linux-amd64.tar.gz

# Configure crictl to use containerd
sudo tee /etc/crictl.yaml << 'EOF'
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false
pull-image-on-create: false
EOF

# Verify crictl configuration
sudo crictl info
```

### Using crictl for Kubernetes Debugging

```bash
# List all images in the k8s.io namespace
sudo crictl images

# Pull an image using CRI
sudo crictl pull nginx:latest

# List pods
sudo crictl pods

# List containers
sudo crictl ps -a

# Get container logs
sudo crictl logs <container-id>

# Execute a command in a container
sudo crictl exec -it <container-id> /bin/sh

# Inspect a container
sudo crictl inspect <container-id>

# View image filesystem info
sudo crictl imagefsinfo
```

### Configure kubelet to Use containerd

When installing Kubernetes, configure kubelet to use containerd:

```bash
# Create kubelet configuration directory
sudo mkdir -p /etc/systemd/system/kubelet.service.d

# Create kubelet configuration for containerd
sudo tee /etc/systemd/system/kubelet.service.d/10-containerd.conf << 'EOF'
[Service]
Environment="KUBELET_EXTRA_ARGS=--container-runtime-endpoint=unix:///run/containerd/containerd.sock"
EOF

# Reload systemd configuration
sudo systemctl daemon-reload
```

## Image Management Best Practices

Effective image management is crucial for maintaining a healthy container environment.

### Image Registry Configuration

```bash
# Create registry configuration directory
sudo mkdir -p /etc/containerd/certs.d/docker.io

# Configure Docker Hub registry with mirrors
sudo tee /etc/containerd/certs.d/docker.io/hosts.toml << 'EOF'
server = "https://registry-1.docker.io"

[host."https://registry-1.docker.io"]
  capabilities = ["pull", "resolve"]
EOF
```

### Configure Private Registry

```bash
# Create configuration for a private registry
sudo mkdir -p /etc/containerd/certs.d/myregistry.example.com

# Configure private registry with authentication
sudo tee /etc/containerd/certs.d/myregistry.example.com/hosts.toml << 'EOF'
server = "https://myregistry.example.com"

[host."https://myregistry.example.com"]
  capabilities = ["pull", "push", "resolve"]
  ca = "/etc/containerd/certs.d/myregistry.example.com/ca.crt"
EOF

# Place your CA certificate
# sudo cp /path/to/ca.crt /etc/containerd/certs.d/myregistry.example.com/ca.crt
```

### Image Garbage Collection

```bash
# Remove unused images with ctr
# First, list all images
sudo ctr images list

# Remove specific unused images
sudo ctr images remove docker.io/library/nginx:old-version

# Using nerdctl for image cleanup (Docker-compatible)
# Remove all unused images
sudo nerdctl image prune -a

# Remove dangling images only
sudo nerdctl image prune
```

### Image Content Trust and Verification

```bash
# containerd supports image verification through config
# Add image verification settings to config.toml

# Edit containerd configuration
sudo nano /etc/containerd/config.toml
```

Add the following for image verification:

```toml
# Image decryption configuration
[plugins."io.containerd.grpc.v1.cri".image_decryption]
  key_model = "node"

# Registry configuration with verification
[plugins."io.containerd.grpc.v1.cri".registry.configs."docker.io".tls]
  insecure_skip_verify = false
```

## Troubleshooting Common Issues

### containerd Service Issues

```bash
# Check containerd service status
sudo systemctl status containerd

# View detailed containerd logs
sudo journalctl -u containerd -f

# Check for configuration errors
sudo containerd config dump

# Validate configuration file syntax
sudo containerd config validate
```

### Network Connectivity Issues

```bash
# Verify CNI plugins are installed
ls -la /opt/cni/bin

# Check CNI configuration
cat /etc/cni/net.d/*.conflist

# Verify IP forwarding is enabled
sysctl net.ipv4.ip_forward

# Check iptables rules
sudo iptables -L -n -v

# Verify bridge interface
ip addr show cni0
```

### Image Pull Failures

```bash
# Test registry connectivity
curl -v https://registry-1.docker.io/v2/

# Check DNS resolution
nslookup registry-1.docker.io

# Verify containerd can reach the registry
sudo ctr images pull --debug docker.io/library/alpine:latest

# Check for proxy settings if behind corporate firewall
env | grep -i proxy
```

### Container Runtime Issues

```bash
# Verify runc is properly installed
which runc
runc --version

# Test runc directly
sudo runc spec
sudo runc list

# Check for AppArmor or SELinux issues
sudo aa-status
getenforce

# View container task errors
sudo ctr tasks list
sudo ctr events
```

### CRI Issues for Kubernetes

```bash
# Verify CRI endpoint is accessible
sudo crictl info

# Check CRI plugin status in containerd
sudo grep -A 50 'plugins."io.containerd.grpc.v1.cri"' /etc/containerd/config.toml

# Test image pull through CRI
sudo crictl pull k8s.gcr.io/pause:3.9

# Verify sandbox image is accessible
sudo crictl images | grep pause
```

## Performance Optimization

### Configure Snapshotter

```bash
# Edit containerd configuration for optimal snapshotter
sudo nano /etc/containerd/config.toml
```

```toml
# Use overlayfs for better performance on supported kernels
[plugins."io.containerd.grpc.v1.cri".containerd]
  snapshotter = "overlayfs"

# Alternatively, use native snapshotter for reliability
# snapshotter = "native"
```

### Memory and Resource Limits

```bash
# Configure systemd resource limits for containerd
sudo mkdir -p /etc/systemd/system/containerd.service.d

sudo tee /etc/systemd/system/containerd.service.d/resources.conf << 'EOF'
[Service]
# Limit memory usage
MemoryMax=2G

# Set OOM score to protect containerd
OOMScoreAdjust=-999

# Increase file descriptor limits
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity
EOF

# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart containerd
```

### Enable Metrics

```bash
# Enable Prometheus metrics in containerd configuration
sudo nano /etc/containerd/config.toml
```

```toml
# Metrics configuration
[metrics]
  # Expose metrics on localhost:9249
  address = "127.0.0.1:9249"
  grpc_histogram = true
```

```bash
# Restart containerd to apply metrics configuration
sudo systemctl restart containerd

# Test metrics endpoint
curl http://127.0.0.1:9249/v1/metrics
```

## Security Hardening

### Configure Seccomp Profiles

```bash
# Download the default seccomp profile
sudo mkdir -p /etc/containerd/seccomp

sudo wget https://raw.githubusercontent.com/containerd/containerd/main/contrib/seccomp/seccomp_default.json \
    -O /etc/containerd/seccomp/default.json
```

### Configure AppArmor

```bash
# Install AppArmor utilities
sudo apt install -y apparmor-utils

# Check AppArmor status
sudo aa-status

# containerd uses the default Docker AppArmor profile
# Verify it is loaded
sudo cat /sys/kernel/security/apparmor/profiles | grep containerd
```

### User Namespace Configuration

```bash
# Enable user namespaces for rootless containers
# Edit containerd config to enable user namespaces

sudo nano /etc/containerd/config.toml
```

```toml
# Enable user namespace remapping for additional isolation
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true
  # Enable user namespaces
  UsernsMode = "auto"
```

## Conclusion

You have now successfully installed and configured containerd on Ubuntu without Docker. This lightweight container runtime provides all the essential capabilities needed for running containers and integrating with Kubernetes.

Key takeaways from this guide:

1. **containerd is Docker's runtime**: containerd provides the core container functionality that Docker uses internally
2. **Multiple installation methods**: Choose between repository packages for stability or binary installation for latest features
3. **Configuration flexibility**: The TOML configuration file offers extensive customization options
4. **CNI networking**: Proper CNI setup is essential for container networking
5. **CLI options**: Use ctr for low-level access and nerdctl for Docker-compatible commands
6. **Kubernetes ready**: containerd is the recommended CRI runtime for Kubernetes

With containerd properly configured, you have a production-ready container runtime that is lighter, faster, and more focused than a full Docker installation. This setup is ideal for Kubernetes clusters, edge computing, and any environment where resource efficiency matters.

## Additional Resources

- [containerd Official Documentation](https://containerd.io/docs/)
- [containerd GitHub Repository](https://github.com/containerd/containerd)
- [nerdctl GitHub Repository](https://github.com/containerd/nerdctl)
- [CNI Plugins Documentation](https://www.cni.dev/plugins/current/)
- [Kubernetes Container Runtime Documentation](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [CRI Tools (crictl) Documentation](https://github.com/kubernetes-sigs/cri-tools)
