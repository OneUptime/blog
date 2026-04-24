# How to Set the Working Directory and User for a Container in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Security, DevOps

Description: Learn how to configure the working directory and running user for Docker containers in Portainer to improve security and application compatibility.

## Introduction

Running containers as root is a common security anti-pattern. Portainer allows you to specify which user a container runs as, and what the working directory is inside the container. These settings are critical for both security hardening and ensuring applications find their files in the right places.

## Prerequisites

- Portainer installed with a connected Docker environment
- Basic understanding of Linux users and file permissions

## Why These Settings Matter

### Working Directory

The working directory (`-w` / `WORKDIR`) determines the current directory when the container process starts. If your application uses relative file paths, this must be set correctly.

### User

If the image does not set a default user, containers run as root (UID 0). This is dangerous because:
- If a container escape occurs, running as root can increase the impact on the host.
- Files created by the container are often owned by root unless you set a different user.
- Principle of least privilege is violated.

Running as a non-root user limits the blast radius of security issues.

## Step 1: Set the Working Directory

In the container creation form in Portainer:

1. Navigate to **Containers > Add container**.
2. Open the **Advanced** section.
3. Find the **Working Dir** field.
4. Enter the desired directory path.

```text
# Examples:

Working dir: /app
Working dir: /var/www/html
Working dir: /home/appuser
Working dir: /opt/myservice
```

This is equivalent to the `-w` flag in `docker run` and overrides any `WORKDIR` set in the image.

## Step 2: Set the Container User

In the same section, find the **User** field:

```text
# Run as a specific user by name:
User: nginx
User: www-data
User: appuser
User: nobody

# Run as a specific UID:
User: 1000

# Run as UID:GID:
User: 1000:1000

# Run as UID with group name:
User: 1000:appgroup
```

Important: If you specify a user or group by name, it must exist inside the container image. Numeric UID:GID values do not require matching passwd or group entries.

## Step 3: Common Patterns

### Running a Node.js App as Non-Root

A well-built Node.js image already creates a `node` user:

```yaml
# docker-compose.yml
services:
  app:
    image: node:20-alpine
    working_dir: /app
    user: node           # Run as the non-root 'node' user
    command: node server.js
    volumes:
      - ./app:/app:ro    # Mount app files read-only
```

### Running Nginx as Non-Root

For a non-root Nginx setup, use the unprivileged image:

```yaml
services:
  nginx:
    image: nginxinc/nginx-unprivileged:stable-alpine
    user: "101"          # nginx user UID in unprivileged image
    working_dir: /usr/share/nginx/html
    ports:
      - "8080:8080"      # Unprivileged port (>1024)
```

### Running Python Application

```yaml
services:
  app:
    image: python:3.12-slim
    working_dir: /usr/src/app
    user: "1000:1000"    # Use UID:GID format
    command: python -m http.server 8000
    volumes:
      - ./src:/usr/src/app:ro
```

### Creating a Custom User in Dockerfile

If your image doesn't have a non-root user, add one:

```dockerfile
FROM alpine:3.23

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S -G appgroup appuser

# Set working directory and permissions
WORKDIR /app
RUN chown appuser:appgroup /app

# Switch to non-root user
USER appuser

COPY --chown=appuser:appgroup . .

CMD ["./myapp"]
```

## Step 4: Handle File Permission Issues

When mounting volumes, the host files must be accessible to the container user:

```bash
# On the host: ensure the directory is owned by the container's UID
sudo chown -R 1000:1000 /data/myapp

# Or align the host group with the container's GID
sudo chgrp -R 1000 /data/myapp
sudo chmod -R g+rwX /data/myapp
```

In Portainer, if a container fails to start with a permissions error:
1. Check the **Logs** - look for "Permission denied".
2. On the host, fix ownership of the mounted path.
3. Or set the container user to one that can read the files.

## Step 5: Verify Settings

After container creation:

```bash
# Verify working directory:
docker exec my-container pwd
# Should output: /app (or whatever you set)

# Verify running user:
docker exec my-container id
# Example output: uid=1000(appuser) gid=1000(appgroup) groups=1000(appgroup)

# Or in Portainer: use the Container Console
# Type: pwd && id
```

## Security Hardening Tips

```yaml
services:
  secure-app:
    image: myorg/myapp:latest
    user: "1000:1000"
    working_dir: /app
    # Additional security settings
    security_opt:
      - no-new-privileges:true    # Prevent privilege escalation
    read_only: true               # Make container filesystem read-only
    tmpfs:
      - /tmp                      # Allow writes to /tmp in memory
```

## Conclusion

Setting the working directory and user in Portainer are two simple configuration changes that meaningfully improve container security and application correctness. Always prefer running containers as non-root users - use established non-root users from official images, or create dedicated users in your Dockerfiles. The working directory ensures your application finds its files without relying on hardcoded absolute paths.
