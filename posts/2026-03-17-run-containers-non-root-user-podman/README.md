# How to Run Containers as a Non-Root User with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Non-Root, Security

Description: Learn how to run containers as a non-root user with Podman for improved security and reduced attack surface.

---

> Running containers as a non-root user adds a layer of security by ensuring that even if a container is compromised, the attacker has limited privileges both inside and outside the container.

Rootless Podman runs the container runtime itself as a non-root user, but the process inside the container may still run as root (within the user namespace). For maximum security, you should also ensure the application process inside the container runs as a non-root user.

---

## Running as a Non-Root User with --user

```bash
# Run a container as a specific UID

podman run --rm --user 1000 alpine:latest id
# Output: uid=1000 gid=0(root)

# Run as a specific UID and GID
podman run --rm --user 1000:1000 alpine:latest id
# Output: uid=1000 gid=1000

# Run as a named user (if it exists in the container image)
podman run --rm --user nobody alpine:latest id
# Output: uid=65534(nobody) gid=65534(nobody)
```

## Defining Non-Root User in a Containerfile

```dockerfile
FROM node:18-alpine

# Create a non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .
RUN npm install

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run - the container runs as appuser
podman build -t my-node-app .
podman run -d --name my-app -p 3000:3000 my-node-app

# Verify the user inside the container
podman exec my-app id
# Output: uid=1001(appuser) gid=1001(appgroup)
```

## Handling File Permissions

```bash
# When mounting volumes, ensure the non-root user can access them
mkdir -p ./app-data
podman unshare chown 1000:1000 ./app-data

podman run -d \
  --name data-app \
  --user 1000:1000 \
  -v ./app-data:/data \
  my-app:latest

# Or use podman unshare to set ownership for the mapped UID
podman unshare chown 1000:1000 ./app-data
```

## Non-Root with Secrets

```bash
# Ensure secrets are readable by the non-root user
echo -n "my-password" | podman secret create db_pass -

podman run -d \
  --name secure-app \
  --user 1000:1000 \
  --secret db_pass,uid=1000,gid=1000,mode=0400 \
  my-app:latest
```

## Running Common Images as Non-Root

```bash
# Nginx (runs as root by default, but supports non-root)
podman run -d \
  --name nginx-nonroot \
  --user 101:101 \
  -p 8080:8080 \
  nginxinc/nginx-unprivileged:latest

# PostgreSQL (requires writable data directory)
podman run -d \
  --name pg-test \
  -e POSTGRES_PASSWORD=test \
  postgres:15
# PostgreSQL already drops to user 'postgres' internally

# Redis (can run as non-root)
podman run -d \
  --name redis-nonroot \
  --user 999:999 \
  redis:7
```

## Verifying Non-Root Execution

```bash
# Check the process user inside the container
podman exec my-app ps aux

# Check the UID from outside
podman top my-app huser hpid
# Shows the mapped UID on the host

# Verify no process is running as root inside
podman exec my-app sh -c '! ps -eo user= | grep -qx root'
```

## Summary

Running containers as a non-root user with Podman combines rootless container execution with non-root application processes for defense in depth. Use `--user` at runtime or the `USER` directive in your Containerfile to specify the application user. Ensure file permissions on volumes and secrets match the non-root UID/GID. This double layer of protection means that even a container escape only yields access as an unprivileged user on the host.
