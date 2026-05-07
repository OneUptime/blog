# How to Run a Podman Container with Read-Only Root Filesystem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Filesystem, Hardening

Description: Learn how to run Podman containers with a read-only root filesystem to prevent unauthorized modifications and improve container security.

---

> A read-only root filesystem is one of the simplest and most effective ways to harden your container against tampering and malware persistence.

Running containers with a read-only root filesystem prevents processes inside the container from writing to the image-backed root filesystem. Writable tmpfs mounts or volumes can still be added for paths that need runtime data. This is a fundamental security practice that stops attackers from modifying binaries, injecting malicious scripts, or persisting backdoors within the container's root filesystem. Podman makes this straightforward with a single flag.

---

## Why Use a Read-Only Root Filesystem

When a container's root filesystem is writable, processes with sufficient privileges inside it can modify system files, install packages, or create new executables. By making the root filesystem read-only, you ensure that the image-backed container filesystem remains exactly as built. This reduces the attack surface significantly.

Common benefits include preventing malware from writing to the image-backed filesystem, reducing configuration drift at runtime, and making containers more predictable in production environments.

## Running a Container with --read-only

The simplest way to launch a read-only container is with the `--read-only` flag.

```bash
# Run an nginx container with a read-only root filesystem

podman run --rm --read-only --name secure-nginx docker.io/library/nginx:alpine
```

This will likely fail because nginx needs to write to certain directories such as its cache directory. You need to allow writes to specific paths using tmpfs mounts.

```bash
# Run nginx with read-only root but writable tmpfs for required paths
podman run --rm -d \
  --read-only \
  --tmpfs /var/cache/nginx:rw,size=64m \
  --tmpfs /var/run:rw,size=1m \
  --tmpfs /tmp:rw,size=32m \
  --name secure-nginx \
  -p 8080:80 \
  docker.io/library/nginx:alpine
```

```bash
# Verify the container is running
podman ps --filter name=secure-nginx
```

## Testing the Read-Only Filesystem

You can verify that writes to the root filesystem are blocked.

```bash
# Attempt to write to the root filesystem - this should fail
podman exec secure-nginx sh -c "touch /usr/share/nginx/html/test.txt"
# Expected output: touch: /usr/share/nginx/html/test.txt: Read-only file system
```

```bash
# Confirm writes to tmpfs paths still work
podman exec secure-nginx sh -c "touch /tmp/test.txt && echo 'Write succeeded'"
# Expected output: Write succeeded
```

## Using Read-Only with Application Containers

For a Python application that needs a writable directory for logs, you can combine `--read-only` with volume mounts.

```bash
# Create a directory on the host for application logs
mkdir -p /tmp/app-logs

# Run a Python container with read-only root and a writable log volume
podman run --rm -d \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  -v /tmp/app-logs:/app/logs:Z \
  --name secure-app \
  docker.io/library/python:3.12-slim \
  python -c "
import time
with open('/app/logs/app.log', 'w') as f:
    f.write('Application started\n')
time.sleep(3600)
"
```

```bash
# Verify the log was written to the mounted volume
cat /tmp/app-logs/app.log
# Expected output: Application started
```

## Inspecting Read-Only Status

You can check whether a running container has a read-only root filesystem.

```bash
# Inspect the container's read-only setting
podman inspect secure-nginx --format '{{.HostConfig.ReadonlyRootfs}}'
# Expected output: true
```

```bash
# List all running containers and their read-only status
podman ps -q | while read cid; do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  ro=$(podman inspect "$cid" --format '{{.HostConfig.ReadonlyRootfs}}')
  echo "Container: $name, ReadOnly: $ro"
done
```

## Using Read-Only in a Podman Compose File

You can also set read-only root filesystem in a compose file.

```yaml
# docker-compose.yml
version: "3"
services:
  web:
    image: docker.io/library/nginx:alpine
    read_only: true
    tmpfs:
      - /var/cache/nginx:size=64m
      - /var/run:size=1m
      - /tmp:size=32m
    ports:
      - "8080:80"
```

```bash
# Launch the compose stack
podman-compose up -d

# Verify it is running
podman-compose ps
```

## Cleanup

```bash
# Stop and remove the containers
podman stop secure-nginx secure-app 2>/dev/null
podman rm secure-nginx secure-app 2>/dev/null
```

## Summary

Running Podman containers with a read-only root filesystem is a simple but powerful security measure. By combining the `--read-only` flag with targeted tmpfs mounts or volume binds for directories that genuinely need write access, you maintain application functionality while preventing unauthorized root filesystem modifications. This practice should be a default in any production container deployment.
