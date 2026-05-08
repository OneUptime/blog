# How to Use devpts Mounts with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, devpts, Volumes, PTY, Terminal

Description: Learn how to configure devpts mounts in Podman for pseudo-terminal device management in containers.

---

> devpts mounts provide pseudo-terminal (PTY) devices inside containers, which are essential for interactive sessions, SSH servers, and terminal-based applications.

The devpts filesystem provides pseudo-terminal slave devices. By default, Podman containers get a basic devpts mount, but you may need to customize it for SSH servers, terminal multiplexers, or other applications that require PTY management.

---

## Understanding devpts in Containers

The devpts filesystem is typically mounted at `/dev/pts` inside containers and provides the PTY devices needed for terminal sessions:

```bash
# Check the default devpts mount in a container

podman run --rm docker.io/library/alpine:latest mount | grep devpts
# Output: devpts on /dev/pts type devpts (rw,nosuid,noexec,relatime,...)

# List PTY devices
podman run --rm -it docker.io/library/alpine:latest ls -la /dev/pts/
```

## Custom devpts Mount Options

```bash
# Mount devpts with specific options
podman run --rm -it \
  --mount type=devpts,target=/dev/pts,uid=0,gid=5,mode=0620,max=1024 \
  docker.io/library/alpine:latest ls -la /dev/pts/
```

## Running an SSH Server with devpts

SSH servers require proper PTY allocation. Configure devpts for sshd:

```bash
# Dockerfile for SSH-enabled container
cat << 'DOCKERFILE' > Containerfile.ssh
FROM docker.io/library/alpine:latest
RUN apk add --no-cache openssh-server && \
    ssh-keygen -A && \
    echo "root:password" | chpasswd && \
    sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]
DOCKERFILE

# Build the SSH container
podman build -t ssh-server -f Containerfile.ssh .

# Run with proper devpts configuration
podman run -d --name sshd \
  --mount type=devpts,target=/dev/pts \
  -p 2222:22 \
  ssh-server
```

## devpts for Terminal Multiplexers

Applications like tmux and screen need PTY devices to function:

```bash
# Run a container with tmux support
podman run --rm -it \
  --mount type=devpts,target=/dev/pts \
  docker.io/library/alpine:latest sh -c "apk add tmux && tmux"
```

## Configuring devpts Mode and Ownership

```bash
# Set specific UID/GID for PTY devices
podman run --rm -it \
  --mount type=devpts,target=/dev/pts,uid=0,gid=5,mode=0620 \
  docker.io/library/ubuntu:latest ls -la /dev/pts/

# The mode 0620 allows:
# - Owner (root): read + write
# - Group (tty, GID 5): write
# - Others: no access
```

## devpts with max

The `max` option controls the maximum number of PTYs for the devpts mount:

```bash
# Limit the devpts mount to 1024 PTYs
podman run --rm -it \
  --mount type=devpts,target=/dev/pts,max=1024 \
  docker.io/library/alpine:latest cat /proc/mounts | grep devpts

# Use a smaller PTY limit for constrained containers
podman run --rm -it \
  --mount type=devpts,target=/dev/pts,max=128 \
  docker.io/library/alpine:latest cat /proc/mounts | grep devpts
```

## Verifying devpts Configuration

```bash
# Check the devpts mount options inside the container
podman run --rm docker.io/library/alpine:latest \
  cat /proc/mounts | grep devpts

# Verify PTY allocation works
podman run --rm -it docker.io/library/python:3-alpine \
  sh -c "python3 -c 'import pty; print(pty.openpty())'" 2>/dev/null || \
  echo "PTY allocation failed"

# Check the number of available PTYs
podman run --rm docker.io/library/alpine:latest \
  cat /proc/sys/kernel/pty/max
```

## Troubleshooting devpts Issues

```bash
# If PTY allocation fails, check the mount
podman exec mycontainer mount | grep devpts

# Verify /dev/pts/ptmx exists and has correct permissions
podman exec mycontainer ls -la /dev/pts/ptmx

# Check kernel PTY limits
podman exec mycontainer cat /proc/sys/kernel/pty/nr
podman exec mycontainer cat /proc/sys/kernel/pty/max
```

## Summary

devpts mounts in Podman provide pseudo-terminal devices that interactive applications, SSH servers, and terminal multiplexers require. Customize devpts mounts with `uid`, `gid`, `mode`, and `max` options to control PTY device ownership, permissions, and limits. Use `--mount type=devpts` for explicit configuration when running containers that need terminal session management.
