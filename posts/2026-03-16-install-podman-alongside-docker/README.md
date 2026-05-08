# How to Install Podman Alongside Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Docker

Description: Learn how to run Podman and Docker side by side on the same system, manage conflicts, and gradually migrate your workflow from Docker to Podman.

---

> Running Podman alongside Docker lets you migrate your container workflow gradually without disrupting existing Docker-based pipelines.

Many teams want to evaluate Podman without immediately abandoning their Docker setup. The good news is that Podman and Docker can coexist on the same system. This guide covers installation, configuration to avoid conflicts, and strategies for running both tools side by side.

---

## Prerequisites

- A Linux system with Docker already installed (or planned)
- A user account with sudo privileges
- An active internet connection

## Step 1: Verify Your Docker Installation

First, confirm Docker is working:

```bash
# Check Docker version

docker --version

# Check Docker service status
sudo systemctl status docker

# Run a Docker test
sudo docker run --rm hello-world
```

## Step 2: Install Podman

### On Fedora

```bash
# Install Podman (Docker can remain installed)
sudo dnf install -y podman
```

### On Debian / Ubuntu

```bash
# Install Podman alongside Docker
sudo apt update
sudo apt install -y podman
```

### On CentOS Stream / RHEL

```bash
# Install Podman
sudo dnf install -y podman
```

## Step 3: Verify Both Are Installed

```bash
# Check both versions
docker --version
podman --version

# Both should report their respective versions
```

## Step 4: Understand the Differences

Key differences that affect coexistence:

```bash
# Docker uses a daemon - check it
sudo systemctl status docker

# Podman is daemonless - no service to check
# Podman uses a socket only when explicitly enabled

# Docker stores images at /var/lib/docker
# Podman stores images at ~/.local/share/containers (rootless)
# or /var/lib/containers (rootful)

# Check storage locations
docker info --format '{{.DockerRootDir}}'
podman info --format '{{.Store.GraphRoot}}'
```

## Step 5: Avoid Socket Conflicts

Docker and Podman use different sockets by default, but Docker-compatible tools can be pointed at either socket:

```bash
# Docker socket location
ls -la /var/run/docker.sock

# Prefer the user-level Podman socket for Docker-compatible Podman tools
systemctl --user enable --now podman.socket

# Verify the user-level socket does not conflict
ls -la $XDG_RUNTIME_DIR/podman/podman.sock

# Keep DOCKER_HOST unset when you want the real Docker Engine
unset DOCKER_HOST
```

## Step 6: Use Separate Commands

Keep Docker and Podman commands distinct:

```bash
# Use docker for Docker operations
docker ps
docker images

# Use podman for Podman operations
podman ps
podman images

# Do NOT install podman-docker package when Docker is present
# It installs a Docker-compatible wrapper/replacement for the docker command
```

## Step 7: Share Images Between Docker and Podman

Transfer images between the two runtimes:

```bash
# Make sure the image exists in Docker first
sudo docker pull nginx:latest

# Export an image from Docker
sudo docker save nginx:latest -o /tmp/nginx-image.tar

# Import it into Podman
podman load -i /tmp/nginx-image.tar

# Verify the image is in Podman
podman images | grep nginx

# Clean up the tar file
rm /tmp/nginx-image.tar
```

Or use a local registry:

```bash
# Make sure the image exists in Docker first
sudo docker pull nginx:latest

# Run a local registry with Docker
sudo docker run -d -p 5000:5000 --name registry registry:2

# Push an image from Docker to the local registry
sudo docker tag nginx:latest localhost:5000/nginx:latest
sudo docker push localhost:5000/nginx:latest

# Pull the image with Podman
podman pull --tls-verify=false localhost:5000/nginx:latest
```

## Step 8: Manage Port Conflicts

Both tools can bind to host ports, so avoid conflicts:

```bash
# Check which ports are in use by Docker containers
sudo docker ps --format "{{.Names}}: {{.Ports}}"

# Check which ports are in use by Podman containers
podman ps --format "{{.Names}}: {{.Ports}}"

# Use different port ranges for each tool
# Docker containers: ports 8000-8099
# Podman containers: ports 9000-9099
```

## Step 9: Handle Network Differences

Docker and Podman use separate network stacks:

```bash
# List Docker networks
sudo docker network ls

# List Podman networks
podman network ls

# They are managed separately and do not share container DNS or network membership by default
# Use published ports to bridge between them if needed
```

## Running a Practical Comparison

Run the same application with both tools:

```bash
# Run Nginx with Docker on port 8080
sudo docker run -d --name docker-nginx -p 8080:80 nginx:latest

# Run Nginx with Podman on port 9080
podman run -d --name podman-nginx -p 9080:80 docker.io/library/nginx:latest

# Test both
echo "Docker Nginx:"
curl -s http://localhost:8080 | head -3

echo "Podman Nginx:"
curl -s http://localhost:9080 | head -3

# Clean up both
sudo docker stop docker-nginx && sudo docker rm docker-nginx
podman stop podman-nginx && podman rm podman-nginx
```

## Migration Strategy

Gradually migrate from Docker to Podman:

```bash
# Step 1: Start using Podman for new projects
podman run -d --name new-project -p 3000:3000 docker.io/library/node:20-alpine

# Step 2: Create Podman equivalents of Docker Compose files
# Docker Compose files work with podman-compose
pip3 install podman-compose

# Step 3: Test existing Docker Compose files with Podman
podman-compose -f docker-compose.yml up -d

# Step 4: Once verified, move services from Docker to Podman
sudo docker stop old-service
podman run -d --name old-service-podman ...
```

## Docker Compose Compatibility

```bash
# Install podman-compose (do not install podman-docker)
pip3 install podman-compose

# Run your existing docker-compose.yml files
podman-compose up -d

# Check running services
podman-compose ps

# Tear down
podman-compose down
```

## Troubleshooting

If you accidentally installed `podman-docker` and it conflicts with Docker:

```bash
# Remove the podman-docker package
sudo dnf remove -y podman-docker    # Fedora
sudo apt remove -y podman-docker    # Debian

# Verify the real Docker CLI is restored
which docker
docker --version
```

If both tools compete for resources:

```bash
# Check total container resource usage
sudo docker stats --no-stream
podman stats --no-stream

# Monitor overall system resources
free -h
df -h
```

## Summary

Podman and Docker can run side by side without conflicts as long as you avoid installing the `podman-docker` compatibility package when you need the real Docker CLI, and keep Docker-compatible tools pointed at the correct socket. Use separate port ranges, maintain independent image stores, and migrate gradually by testing existing workflows with Podman before fully switching.
