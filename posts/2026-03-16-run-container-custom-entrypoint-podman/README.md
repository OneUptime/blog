# How to Run a Container with a Custom Entrypoint in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Entrypoint, Container Configuration

Description: Learn how to override and customize container entrypoints in Podman to change default behavior, run alternative commands, and debug container startup.

---

> Custom entrypoints let you change what a container runs at startup without modifying the image itself.

Every container image defines a default command or entrypoint that runs when the container starts. Sometimes you need to override this - to run a different command, debug startup issues, or use the same image for different purposes. This guide covers how entrypoints work and how to customize them in Podman.

---

## Understanding Entrypoint vs Command

Container images have two startup directives:

- **ENTRYPOINT** - The main executable. Always runs.
- **CMD** - Default arguments to the entrypoint. Can be easily overridden.

```bash
# See an image's default entrypoint and command

podman inspect nginx --format 'Entrypoint: {{.Config.Entrypoint}}'
podman inspect nginx --format 'Cmd: {{.Config.Cmd}}'

# For nginx:
# Entrypoint: [/docker-entrypoint.sh]
# Cmd: [nginx -g daemon off;]
```

## Overriding the Command

Append a command to override CMD while keeping the entrypoint:

```bash
# Default: runs nginx
podman run -d nginx

# Override CMD: run a shell instead
podman run -it --rm nginx bash

# Override CMD: run a specific command
podman run --rm nginx nginx -t
# This tests the nginx configuration
```

## Overriding the Entrypoint

Use `--entrypoint` to replace the image's ENTRYPOINT:

```bash
# Override the entrypoint with a shell
podman run -it --rm --entrypoint /bin/bash nginx

# Override with a different command
podman run --rm --entrypoint /bin/cat nginx /etc/nginx/nginx.conf

# Override with sh for images without bash
podman run -it --rm --entrypoint /bin/sh alpine
```

## Practical Entrypoint Overrides

### Debugging Container Startup

```bash
# A container keeps crashing. Debug by overriding the entrypoint:
podman run -it --rm --entrypoint /bin/bash myapp:latest

# Inside the container, you can:
# - Check configuration files
# - Test connectivity
# - Run the application manually to see errors
# - Inspect the filesystem
```

### Running Database Utilities

```bash
# Use the PostgreSQL image for database utilities instead of running the server
podman run --rm --entrypoint pg_dump \
    -e PGPASSWORD=secret \
    postgres:16 \
    -h host.containers.internal -U myuser mydb > backup.sql

# Run psql client against a remote database
podman run -it --rm --entrypoint psql \
    -e PGPASSWORD=secret \
    postgres:16 \
    -h host.containers.internal -U myuser -d mydb
```

### Running Tests Instead of the Application

```bash
# The image normally runs the app, but you want to run tests
podman run --rm --entrypoint npm myapp:latest test

# Or run a linter
podman run --rm --entrypoint npm myapp:latest run lint
```

## Custom Entrypoint Scripts

Create a custom entrypoint script that runs initialization tasks:

```bash
# Create an entrypoint script
cat > entrypoint.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "=== Custom Entrypoint ==="
echo "Running initialization..."

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" 2>/dev/null; do
        sleep 1
    done
    echo "Database is ready"
fi

# Run migrations if requested
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running migrations..."
    npm run migrate
fi

# Execute the main command
echo "Starting application..."
exec "$@"
SCRIPT

chmod +x entrypoint.sh

# Mount and use the custom entrypoint
podman run -d --name app \
    -v $(pwd)/entrypoint.sh:/entrypoint.sh:ro \
    --entrypoint /entrypoint.sh \
    -e DATABASE_URL=postgres://user:pass@db:5432/myapp \
    -e DB_HOST=db \
    -e DB_PORT=5432 \
    -e RUN_MIGRATIONS=true \
    -p 3000:3000 \
    myapp:latest node server.js
```

## Entrypoint with JSON Array vs String Form

```bash
# JSON array form - use this when the replacement entrypoint has multiple parts
podman run --entrypoint '["node", "server.js"]' myapp

# Single-command form - treated as the executable to run
podman run --entrypoint /usr/bin/node myapp server.js

# The JSON array form is useful when:
# - The entrypoint itself needs fixed arguments
# - You want to keep the entrypoint and runtime arguments separate
# - You need to avoid shell-style word splitting or quoting issues
```

## Combining Entrypoint with Command

The entrypoint and command work together:

```bash
# Entrypoint provides the executable, command provides arguments
podman run --rm --entrypoint /bin/echo nginx "Hello from Podman"

# Override both entrypoint and command
podman run --rm --entrypoint python3 python:3.12 -c "print('Hello World')"

# Use entrypoint for the binary, arguments come after the image name
podman run --rm --entrypoint curl alpine/curl -s https://httpbin.org/ip
```

## Clearing the Entrypoint

Set an empty entrypoint to remove it entirely:

```bash
# Remove the entrypoint, then only CMD runs
podman run --rm --entrypoint "" nginx nginx -t

# This is useful when the entrypoint script is causing issues
podman run -it --rm --entrypoint "" myapp:latest /bin/bash
```

## Inspecting Entrypoint Behavior

```bash
# See what the container will run
podman inspect myapp --format '{{json .Config.Entrypoint}}' | jq
podman inspect myapp --format '{{json .Config.Cmd}}' | jq

# Check what a running container started with
podman inspect my-running-container --format '{{.Config.Entrypoint}} {{.Config.Cmd}}'

# View the entrypoint script content
podman run --rm --entrypoint cat myapp /docker-entrypoint.sh
```

## Multi-Purpose Image Pattern

Use entrypoint overrides to use one image for multiple purposes:

```bash
# Run the application server
podman run -d --name app -p 3000:3000 myapp:latest

# Run background workers from the same image
podman run -d --name worker --entrypoint npm myapp:latest run worker

# Run one-off tasks
podman run --rm --entrypoint npm myapp:latest run seed-database

# Run the test suite
podman run --rm --entrypoint npm myapp:latest test
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run --entrypoint /bin/bash <image>` | Override entrypoint |
| `podman run --entrypoint "" <image> <cmd>` | Clear entrypoint |
| `podman run <image> <cmd>` | Override CMD only |
| `podman inspect <image> --format '{{.Config.Entrypoint}}'` | View default entrypoint |

## Summary

Custom entrypoints give you full control over what runs when a container starts. Use `--entrypoint` to override the default executable for debugging, running utilities, or repurposing an image. Combine entrypoints with commands for flexible container configurations, and create custom entrypoint scripts for initialization logic. Understanding the relationship between ENTRYPOINT and CMD is key to effectively customizing container behavior.
