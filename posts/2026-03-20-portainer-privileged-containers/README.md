# How to Run Privileged Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Security, Linux

Description: Learn when and how to run privileged Docker containers in Portainer, along with safer alternatives to avoid using privileged mode.

## Introduction

A privileged container has all Linux capabilities and access to almost all host resources - it removes most of the normal security isolation between the container and the host. While this is sometimes necessary for system-level tools and certain drivers, it's a significant security risk that should be avoided whenever possible. This guide explains how to enable privileged mode in Portainer and presents safer alternatives.

## Prerequisites

- Portainer installed with a connected Docker environment
- Permission in Portainer to deploy containers or stacks (privileged mode may be restricted to administrators)

## What Does Privileged Mode Enable?

Running a container with `--privileged`:
- Grants all Linux capabilities (CAP_SYS_ADMIN, CAP_NET_ADMIN, etc.)
- Allows access to all host devices (`/dev`)
- Disables the default seccomp profile and relaxes AppArmor/SELinux confinement
- Allows mounting filesystems
- Allows loading kernel modules
- Gives the container very broad access to the host's resources

In practice, this gives the container nearly the same host access as a process running outside Docker.

## When Is Privileged Mode Needed?

| Use Case | Alternative |
|----------|-------------|
| Docker-in-Docker (DinD) | If you only need the host daemon, mount `/var/run/docker.sock` instead |
| Kernel module loading | Preload on host; avoid in containers |
| Mounting filesystems (NFS, FUSE) | Use `--cap-add SYS_ADMIN` + specific devices |
| Some system monitoring tools | Use specific device mounts |
| Network tool containers | Use `--cap-add NET_ADMIN` |

## Step 1: Enable Privileged Mode in Portainer

### For Individual Containers

1. Navigate to **Containers > Add container**.
2. Scroll to the **Runtime & Resources** section.
3. Find the **Privileged mode** toggle.
4. Enable it.

```bash
# Equivalent Docker CLI command:

docker run --privileged \
  --name my-privileged-container \
  alpine:latest
```

### For Stacks (Docker Compose)

```yaml
# docker-compose.yml
services:
  # Docker-in-Docker use case
  dind:
    image: docker:dind
    privileged: true   # Required for DinD
    environment:
      - DOCKER_TLS_CERTDIR=/certs
    volumes:
      - dind-certs-ca:/certs/ca
      - dind-certs-client:/certs/client
    restart: unless-stopped

volumes:
  dind-certs-ca:
  dind-certs-client:
```

## Step 2: Safer Alternatives to Privileged Mode

### Alternative 1: Add Specific Capabilities

Instead of all capabilities, add only what's needed:

```yaml
services:
  network-tool:
    image: myorg/net-tool:latest
    # Avoid: privileged: true
    # Instead, add only the needed capabilities:
    cap_add:
      - NET_ADMIN       # Allows network configuration
      - NET_RAW         # Allows raw sockets (ping, etc.)
    cap_drop:
      - ALL             # Drop all first, then add back only what's needed
```

### Alternative 2: Device Mapping Instead of Privileged

```yaml
services:
  storage-tool:
    image: myorg/storage:latest
    # Instead of privileged mode, map specific devices:
    devices:
      - /dev/sda:/dev/sda:r   # Read-only access to specific disk
    cap_add:
      - SYS_ADMIN             # Only for mounting, if truly needed
```

### Alternative 3: Docker Socket Mounting (Host Daemon Access)

```yaml
services:
  ci-runner:
    image: docker:cli
    # Mount the Docker socket when the container only needs the host Docker daemon
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    # No privileged mode needed!
```

Note: Mounting the Docker socket also grants significant host access - it's not truly safe, and it gives the container broad control over the host Docker daemon.

### Alternative 4: User Namespaces (Defense in Depth)

Enable user namespace remapping in the Docker daemon by adding this to `/etc/docker/daemon.json`:

```json
{
  "userns-remap": "default"
}
```

This does not replace capabilities or device mapping, but it can limit the impact of container escapes by mapping the container's root user to an unprivileged host user.

## Step 3: Common Privileged Container Use Cases

### Docker-in-Docker Daemon

```yaml
services:
  dind:
    image: docker:dind
    privileged: true   # Required for docker:dind
    environment:
      - DOCKER_TLS_CERTDIR=/certs
```

### System Package Installation (Ansible Target)

```yaml
services:
  ansible-target:
    image: myorg/systemd-container:latest
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
    tmpfs:
      - /run
      - /tmp
```

### FUSE Filesystem Mounting

```yaml
services:
  fuse-mounter:
    image: myorg/fuse-client:latest
    # More targeted than privileged:
    cap_add:
      - SYS_ADMIN
    devices:
      - /dev/fuse:/dev/fuse
    security_opt:
      - apparmor:unconfined
```

## Step 4: Audit Privileged Containers

Regularly audit which containers run in privileged mode:

```bash
# List all running privileged containers:
docker ps -q | xargs -r docker inspect --format='{{.Name}} {{.HostConfig.Privileged}}' | grep true

# In Portainer: navigate to Containers
# Sort or filter for containers with Privileged mode enabled
```

## Security Warning

Running privileged containers in production is a significant security risk:

- A vulnerability in the application running inside a privileged container can lead to full host compromise.
- Privilege escalation attacks are trivial in privileged containers.
- It violates container isolation principles.

Before enabling privileged mode, always ask: **"What specific capability does this container need?"** and use targeted capability additions instead.

## Conclusion

Privileged mode in Portainer is easy to enable but should be used sparingly. For many use cases, there are safer alternatives: adding specific Linux capabilities, mapping specific devices, or mounting the Docker socket when the container only needs the host daemon. Reserve privileged mode for true system-level containers like Docker-in-Docker, and always document why it was needed. The security trade-off is significant, so scrutinize every request to run privileged containers.
