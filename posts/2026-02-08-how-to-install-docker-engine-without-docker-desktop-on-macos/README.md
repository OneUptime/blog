# How to Install Docker Engine Without Docker Desktop on macOS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, macOS, Colima, Lima, Installation, DevOps, Containers, Apple Silicon, Docker Engine

Description: How to run Docker Engine on macOS without Docker Desktop by using Colima, Lima, or other lightweight alternatives for a free and flexible container runtime.

---

Docker Desktop is the standard way to run Docker on macOS, but it is not the only way. Docker Desktop requires a paid subscription for companies with more than 250 employees or $10 million in annual revenue. Even for smaller teams, the resource overhead and occasional bugs can be frustrating. Fortunately, you can run Docker Engine on macOS using lightweight virtual machine tools. This guide covers the most practical approaches.

## Why Skip Docker Desktop?

- **Licensing costs** for larger organizations
- **Resource usage** - Docker Desktop runs a full Linux VM with a GUI layer
- **Flexibility** - alternatives let you control VM size, runtime version, and networking
- **Simplicity** - command-line tools without the desktop app overhead

## Option 1: Colima (Recommended)

Colima is the most popular Docker Desktop alternative on macOS. It runs a lightweight Linux VM using Lima and configures Docker inside it automatically. The entire setup takes one command.

### Install Colima and Docker CLI

```bash
# Install Colima and the Docker CLI using Homebrew
brew install colima docker docker-compose docker-buildx
```

This installs:
- `colima` - the VM manager
- `docker` - the Docker CLI (not the daemon)
- `docker-compose` - standalone Compose binary
- `docker-buildx` - multi-platform build support

### Start Colima

```bash
# Start Colima with default settings (2 CPUs, 2 GB RAM, 60 GB disk)
colima start
```

For more resources:

```bash
# Start with custom resources
colima start --cpu 4 --memory 8 --disk 100
```

For Apple Silicon Macs, Colima runs an ARM64 VM by default. To also build x86_64 images:

```bash
# Start with Rosetta 2 emulation for x86_64 support
colima start --arch aarch64 --vm-type vz --vz-rosetta
```

The `--vm-type vz` flag uses Apple's Virtualization framework (available on macOS 13+), which is faster than the default QEMU.

### Verify Docker Works

```bash
# Test the Docker installation
docker run hello-world

# Check Docker info
docker info
```

### Managing Colima

```bash
# Check Colima status
colima status

# Stop Colima (stops the Docker daemon)
colima stop

# Restart with different resources
colima stop
colima start --cpu 4 --memory 8

# Delete the VM entirely
colima delete
```

### File Sharing

Colima mounts your home directory by default. Files under `~` are accessible inside containers.

```bash
# Mount your project into a container
docker run -it --rm -v $(pwd):/app -w /app node:20-alpine sh
```

For directories outside your home, configure additional mounts.

```bash
# Start Colima with additional mount points
colima start --mount /Volumes/data:/data:w
```

The `:w` suffix enables writable access.

## Option 2: Lima with Manual Docker Setup

Lima (Linux Machines) is the underlying tool that Colima uses. You can use it directly for more control.

### Install Lima

```bash
# Install Lima
brew install lima
```

### Create a Docker VM

```bash
# Create a VM from Docker's template
limactl start --name=docker template://docker

# Set the Docker host to use the Lima VM
export DOCKER_HOST=unix://$HOME/.lima/docker/sock/docker.sock
```

Add the export to your shell profile.

```bash
# Add to your shell profile (~/.zshrc for Zsh, ~/.bash_profile for Bash)
echo 'export DOCKER_HOST=unix://$HOME/.lima/docker/sock/docker.sock' >> ~/.zshrc
source ~/.zshrc
```

### Test Docker

```bash
# Verify Docker works through Lima
docker run hello-world
```

### Managing Lima VMs

```bash
# List running VMs
limactl list

# Stop the Docker VM
limactl stop docker

# Start it again
limactl start docker

# Delete the VM
limactl delete docker
```

## Option 3: OrbStack

OrbStack is a commercial but lightweight alternative to Docker Desktop. It provides a faster experience with lower resource usage.

```bash
# Install OrbStack
brew install orbstack
```

Launch OrbStack from Applications. It provides full Docker compatibility and automatically configures the Docker CLI.

```bash
# OrbStack configures Docker socket automatically
docker run hello-world
```

OrbStack is free for personal use and has a commercial license for teams.

## Setting Up Docker Compose

If you installed `docker-compose` via Homebrew, it is ready to use.

```bash
# Verify Docker Compose
docker compose version
docker-compose version
```

Both the plugin (`docker compose`) and standalone (`docker-compose`) versions should work.

### Test with a Compose Stack

```yaml
# docker-compose.yml - test stack
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro

  redis:
    image: redis:alpine
```

```bash
# Create a test HTML file
mkdir -p html
echo "<h1>Docker works on macOS without Docker Desktop</h1>" > html/index.html

# Start the stack
docker compose up -d

# Test it
curl http://localhost:8080

# Clean up
docker compose down
```

## Building Multi-Architecture Images

A key advantage of running Docker on Apple Silicon is building for both ARM64 and AMD64 targets.

### With Colima and Rosetta

If you started Colima with `--vm-type vz --vz-rosetta`, you can build for both architectures.

```bash
# Create a builder that supports multiple platforms
docker buildx create --name multiarch --use

# Build for both architectures
docker buildx build --platform linux/amd64,linux/arm64 -t my-app:latest .
```

### With QEMU

If Rosetta is not available (macOS 12 or earlier), use QEMU emulation.

```bash
# Start Colima with QEMU (default)
colima start

# Build for a different architecture
docker buildx build --platform linux/amd64 -t my-app:amd64 --load .
```

QEMU emulation is significantly slower than Rosetta for cross-architecture builds.

## Performance Tuning

### Volume Mount Performance

File sharing between macOS and the Linux VM has a performance cost. For large projects, this can make builds and file-heavy operations slow.

Use VirtioFS for better performance (Colima with `--vm-type vz` enables this automatically on macOS 13+).

For build performance, copy files into the container rather than mounting them.

```dockerfile
# Faster builds: COPY instead of relying on volume mounts
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### Memory and CPU

Monitor resource usage inside the VM.

```bash
# Check Colima VM resource usage
colima status

# Check container-level resource usage
docker stats --no-stream
```

Adjust resources based on your workload.

```bash
# Restart Colima with more memory for heavy workloads
colima stop
colima start --cpu 6 --memory 12
```

## Docker Context Management

If you switch between different Docker environments (Colima, remote servers, etc.), use Docker contexts.

```bash
# List available contexts
docker context ls

# Create a context for a remote Docker host
docker context create remote --docker "host=ssh://user@remote-server"

# Switch between contexts
docker context use colima
docker context use remote
```

## Troubleshooting

### "Cannot connect to the Docker daemon"

Make sure Colima (or your chosen VM) is running.

```bash
# Check Colima status
colima status

# Start it if stopped
colima start
```

Also verify the DOCKER_HOST environment variable is set correctly (or unset if using Colima, which configures the socket automatically).

### Docker commands are slow

Volume mounts are the usual culprit. Use named volumes for dependencies.

```yaml
# Use named volumes for node_modules and other dependency directories
services:
  app:
    build: .
    volumes:
      - .:/app
      - node_modules:/app/node_modules

volumes:
  node_modules:
```

### "image platform does not match" errors

On Apple Silicon, pulling images without ARM64 support will fail or run under emulation.

```bash
# Force pull for a specific platform
docker pull --platform linux/amd64 some-amd64-only-image
```

### Port conflicts

If a port is already in use on macOS, Docker will fail to bind.

```bash
# Check what is using a port
lsof -i :8080
```

## Summary

Running Docker on macOS without Docker Desktop is straightforward with Colima. A single `brew install colima docker` followed by `colima start` gives you a fully functional Docker environment. Lima provides more control for advanced users, and OrbStack offers a polished commercial alternative. All three options provide the Docker CLI experience you expect, with better control over resource usage and no licensing concerns.
