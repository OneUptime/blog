# How to Alias Docker Commands to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Migration, CLI, Compatibility

Description: Learn how to alias Docker commands to Podman so that existing scripts, tools, and muscle memory continue to work seamlessly with Podman.

---

> Aliasing Docker to Podman lets you use many existing scripts and workflows unchanged while benefiting from Podman's daemonless, rootless architecture.

Many developers and teams have years of muscle memory and hundreds of scripts that use `docker` commands. When migrating to Podman, you do not have to rewrite everything at once. Podman provides a Docker-compatible CLI for many common commands, and a simple alias can make the transition transparent. This guide covers common methods for aliasing Docker to Podman and handling the edge cases you may encounter.

---

## Simple Shell Alias

The quickest way to redirect Docker commands to Podman is a shell alias.

```bash
# Add to your ~/.bashrc or ~/.zshrc

alias docker=podman

# Apply the change immediately
source ~/.bashrc

# Test the alias
docker --version
# Output: podman version 4.x.x

docker ps
# Runs: podman ps
```

## System-Wide Alias with a Symlink

For a system-wide solution that works for all users and non-interactive shells, create a symlink.

```bash
# Check where Podman is installed
which podman
# Output: /usr/bin/podman

# Create a symlink so 'docker' points to Podman
sudo ln -sf /usr/bin/podman /usr/local/bin/docker

# Verify the symlink
ls -la /usr/local/bin/docker
docker --version
```

## Installing the podman-docker Package

Many distributions provide a `podman-docker` package that creates a Docker-compatible command wrapper or symlink. Depending on the distribution, it may also provide Docker-compatible socket paths, but the Podman socket service still needs to be available for Docker API clients.

```bash
# Install on Fedora/RHEL
sudo dnf install -y podman-docker

# Install on Ubuntu/Debian
sudo apt-get install -y podman-docker

# This package typically creates:
# - A docker command wrapper or symlink that runs Podman
# - Docker-compatible man pages
# - Emulated 'docker' command behavior

# Verify
docker info
docker ps
```

## Handling Docker Compose

Docker Compose is a separate tool. Use `podman-compose` or configure Podman's compose wrapper.

```bash
# Install podman-compose
pip3 install podman-compose

# Alias docker-compose to podman-compose
alias docker-compose=podman-compose

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'alias docker-compose=podman-compose' >> ~/.bashrc

# Alternatively, use Podman's compose wrapper (Podman 4.7+)
# This runs an external compose provider such as docker-compose or podman-compose
podman compose up -d
```

## Wrapper Script for Advanced Compatibility

For more control, use a wrapper script instead of a simple alias.

```bash
#!/bin/bash
# /usr/local/bin/docker - Wrapper script for Docker-to-Podman compatibility

# Handle docker-specific subcommands that differ in Podman
case "$1" in
  system)
    # Map 'docker system prune' to 'podman system prune'
    shift
    exec podman system "$@"
    ;;
  compose)
    # Redirect compose commands to podman-compose
    shift
    exec podman-compose "$@"
    ;;
  *)
    # Pass everything else directly to Podman
    exec podman "$@"
    ;;
esac
```

```bash
# Make the wrapper executable
sudo chmod +x /usr/local/bin/docker

# Test the wrapper
docker ps
docker compose up -d
docker system prune -f
```

## Environment Variables for Compatibility

Some tools look for the `DOCKER_HOST` environment variable. Set it to point to Podman's socket.

```bash
# Start the Podman socket service (for rootless operation)
systemctl --user enable --now podman.socket

# Set DOCKER_HOST to the Podman socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Add to your shell profile for persistence
echo "export DOCKER_HOST=\"unix://\${XDG_RUNTIME_DIR}/podman/podman.sock\"" \
  >> ~/.bashrc

# Test with tools that use DOCKER_HOST
docker info
```

## Updating Existing Scripts

For scripts that reference Docker explicitly, here are strategies to make them compatible.

```bash
# Option 1: Use sed to update scripts in place
# Replace 'docker' with 'podman' in a script
sed -i 's/\bdocker\b/podman/g' deploy.sh

# Option 2: Set the docker command as a variable at the top of scripts
# This makes it easy to switch between Docker and Podman
CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"
$CONTAINER_RUNTIME build -t myapp .
$CONTAINER_RUNTIME run --rm myapp

# Option 3: Check which runtime is available
if command -v podman &>/dev/null; then
  RUNTIME="podman"
elif command -v docker &>/dev/null; then
  RUNTIME="docker"
else
  echo "No container runtime found" >&2
  exit 1
fi
$RUNTIME build -t myapp .
```

## Verifying Compatibility

Test that common Docker operations work correctly through the alias.

```bash
# Test image operations
docker pull alpine:latest
docker images
docker tag alpine:latest myalpine:test
docker rmi myalpine:test

# Test container operations
docker run --rm alpine echo "Hello from Podman"
docker run -d --name test-nginx -p 8080:80 nginx
docker ps
docker logs test-nginx
docker stop test-nginx
docker rm test-nginx

# Test build operations
echo 'FROM alpine:latest
RUN echo "Built with Podman via Docker alias"' > /tmp/Dockerfile

docker build -t test-build -f /tmp/Dockerfile /tmp
docker rmi test-build
```

## Handling Known Differences

A few Docker features behave differently in Podman. Be aware of these when aliasing.

```bash
# Docker uses a daemon; Podman does not
# 'docker info' will show Podman info instead of Docker daemon info
docker info | head -5

# Docker volumes are stored differently in Podman
# Named volumes work the same way
docker volume create mydata
docker volume ls
docker volume inspect mydata

# Network behavior differs slightly
# Current Podman releases use Netavark by default; older installations may use CNI
docker network create mynet
docker network ls
```

## Summary

Aliasing Docker commands to Podman is the fastest way to migrate without disrupting existing workflows. Whether you use a simple shell alias, a system-wide symlink, the `podman-docker` package, or a custom wrapper script, the transition can be transparent to your scripts and team members. Set the `DOCKER_HOST` environment variable for tools that need a socket connection, and update scripts gradually using a configurable runtime variable. With these techniques, you can adopt Podman incrementally while maintaining broad compatibility with Docker-based tooling.
