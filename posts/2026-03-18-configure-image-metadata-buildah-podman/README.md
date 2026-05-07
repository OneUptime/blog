# How to Configure Image Metadata with Buildah and Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Image Metadata, OCI, Labels

Description: Learn how to set and manage container image metadata like labels, environment variables, ports, and entrypoints using Buildah and Podman.

---

> Well-configured image metadata makes containers self-documenting and easier to operate in production.

Container image metadata controls how a container behaves when it runs, including its entrypoint, environment variables, exposed ports, and user context. It also includes descriptive labels that help with image management and compliance. Buildah provides the `buildah config` command to set image configuration metadata before committing the final image. This guide covers the most common runtime and descriptive metadata options.

---

## Prerequisites

```bash
# Ensure Buildah and Podman are installed

buildah --version
podman --version

# Create a working container
container=$(buildah from alpine:3.19)
echo "Container: $container"
```

## Setting Environment Variables

```bash
# Set individual environment variables
buildah config --env APP_NAME=myservice $container
buildah config --env APP_ENV=production $container
buildah config --env APP_PORT=8080 $container
buildah config --env LOG_LEVEL=info $container

# Set multiple related variables
buildah config --env DB_HOST=localhost $container
buildah config --env DB_PORT=5432 $container
buildah config --env DB_NAME=appdb $container

# Verify environment variables are set
buildah inspect --format '{{range .OCIv1.Config.Env}}{{println .}}{{end}}' $container
```

## Setting the Working Directory

```bash
# Set the default working directory for the container
buildah config --workingdir /app $container

# The working directory is used as the default location for:
# - RUN commands executed with buildah run
# - The entrypoint/cmd when the container starts
# - Relative paths in copy operations

# Verify the working directory
buildah inspect --format '{{.OCIv1.Config.WorkingDir}}' $container
```

## Configuring Entrypoint and Command

```bash
# ENTRYPOINT defines the executable that runs when the container starts
# CMD provides default arguments to the entrypoint

# Set entrypoint as a JSON array (exec form - recommended)
buildah config --entrypoint '["python3", "-u"]' $container

# Set default command arguments
buildah config --cmd '["app.py", "--host", "0.0.0.0"]' $container

# When the container runs, it executes: python3 -u app.py --host 0.0.0.0

# Verify the configuration
buildah inspect --format 'Entrypoint: {{.OCIv1.Config.Entrypoint}}' $container
buildah inspect --format 'Cmd: {{.OCIv1.Config.Cmd}}' $container

# Shell form (not recommended but sometimes useful)
buildah config --entrypoint 'python3 -u app.py' $container

# Clear the entrypoint
buildah config --entrypoint '[]' $container

# Set just CMD without entrypoint
buildah config --entrypoint '[]' $container
buildah config --cmd '["python3", "app.py"]' $container
```

## Exposing Ports

```bash
# Declare which ports the application listens on
buildah config --port 8080 $container
buildah config --port 8443/tcp $container
buildah config --port 9090/udp $container

# Expose multiple ports (note: this is documentation only,
# it does not actually publish ports at runtime)

# Verify exposed ports
buildah inspect --format '{{range $key, $val := .OCIv1.Config.ExposedPorts}}{{$key}} {{end}}' $container
```

## Setting Labels

```bash
# Labels provide metadata about the image
# Standard OCI labels
buildah config --label org.opencontainers.image.title="My Service" $container
buildah config --label org.opencontainers.image.description="A sample microservice" $container
buildah config --label org.opencontainers.image.version="1.2.0" $container
buildah config --label org.opencontainers.image.authors="team@example.com" $container
buildah config --label org.opencontainers.image.url="https://example.com/myservice" $container
buildah config --label org.opencontainers.image.source="https://github.com/example/myservice" $container
buildah config --label org.opencontainers.image.created="$(date -u +%Y-%m-%dT%H:%M:%SZ)" $container

# Custom labels for internal tooling
buildah config --label com.example.team="platform" $container
buildah config --label com.example.tier="backend" $container
buildah config --label com.example.compliance="soc2" $container

# Verify all labels
buildah inspect --format '{{range $key, $val := .OCIv1.Config.Labels}}{{$key}}={{$val}}{{println}}{{end}}' $container
```

## Setting the User

```bash
# Set the user that the container process runs as
# Using a numeric UID (most portable)
buildah config --user 1000 $container

# Using UID:GID
buildah config --user 1000:1000 $container

# Using a named user (must exist in /etc/passwd inside the container)
buildah run $container -- adduser -D appuser
buildah config --user appuser $container

# Verify the user setting
buildah inspect --format '{{.OCIv1.Config.User}}' $container
```

## Setting Volume Mount Points

```bash
# Declare volume mount points that can be mounted at runtime
buildah config --volume /data $container
buildah config --volume /var/log/app $container
buildah config --volume /config $container

# Verify volumes
buildah inspect --format '{{range $key, $val := .OCIv1.Config.Volumes}}{{$key}} {{end}}' $container
```

## Setting Stop Signal

```bash
# Configure the image stop signal
# Buildah's image stop-signal setting defaults to SIGINT, but some applications need a different signal
buildah config --stop-signal SIGQUIT $container

# SIGQUIT is useful for applications like Nginx that do graceful shutdown on SIGQUIT
# SIGINT is useful for applications that handle Ctrl+C

# Verify
buildah inspect --format '{{.OCIv1.Config.StopSignal}}' $container
```

## Setting Shell and History

```bash
# Set the default shell for shell-form RUN commands
buildah config --shell '["/bin/ash", "-c"]' $container

# Add a comment/history entry to the image
buildah config --comment "Production build - optimized for performance" $container

# Set the author field
buildah config --author "Platform Team <platform@example.com>" $container
```

## Complete Metadata Example

```bash
# Remove the previous container and start fresh
buildah rm $container
container=$(buildah from python:3.12-slim)

# Install application dependencies
buildah run $container -- pip install --no-cache-dir flask gunicorn

# Copy application code
echo 'from flask import Flask; app = Flask(__name__)' > /tmp/app.py
buildah copy $container /tmp/app.py /app/app.py

# Apply all metadata
buildah config --workingdir /app $container
buildah config --env FLASK_ENV=production $container
buildah config --env GUNICORN_WORKERS=4 $container
buildah config --port 5000 $container
buildah config --entrypoint '["gunicorn"]' $container
buildah config --cmd '["--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]' $container
buildah config --user 1000:1000 $container
buildah config --volume /app/data $container
buildah config --stop-signal SIGTERM $container
buildah config --label org.opencontainers.image.title="Flask Service" $container
buildah config --label org.opencontainers.image.version="2.0.0" $container
buildah config --author "Platform Team" $container

# Commit with all metadata
buildah commit $container flask-service:2.0.0

# Inspect the final image metadata with Podman
podman inspect flask-service:2.0.0 --format '
Entrypoint: {{.Config.Entrypoint}}
Cmd: {{.Config.Cmd}}
WorkingDir: {{.Config.WorkingDir}}
User: {{.Config.User}}
ExposedPorts: {{.Config.ExposedPorts}}
StopSignal: {{.Config.StopSignal}}'
```

## Cleaning Up

```bash
buildah rm --all
podman rmi flask-service:2.0.0 2>/dev/null
rm -f /tmp/app.py
```

## Summary

Buildah config provides comprehensive control over common container image metadata. From runtime behavior settings like entrypoint, environment variables, and user context to documentation through labels and annotations, you can configure how your image behaves and is identified. Using standardized OCI labels makes images discoverable and manageable at scale. Metadata set with Buildah is preserved when the image is committed and can be used by Podman or any OCI-compatible runtime.
