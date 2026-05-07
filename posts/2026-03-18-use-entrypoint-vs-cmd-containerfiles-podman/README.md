# How to Use ENTRYPOINT vs CMD in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, Entrypoint, CMD, DevOps

Description: Understand the differences between ENTRYPOINT and CMD in Containerfiles for Podman, when to use each, and how to combine them for flexible container behavior.

---

> Understanding when to use ENTRYPOINT, when to use CMD, and when to combine both is one of the most important skills for writing professional Containerfiles.

One of the most common sources of confusion when writing Containerfiles is understanding the difference between ENTRYPOINT and CMD. Both instructions define what happens when a container starts, but they serve different purposes and interact in specific ways. This guide will clarify the distinction, show you when to use each approach, and demonstrate practical patterns for combining them with Podman.

---

## The Fundamental Difference

CMD sets the default command that runs when a container starts. It can be easily overridden by passing arguments to `podman run`. ENTRYPOINT sets the main executable for the container. It is harder to override and is intended to make the container behave like a specific command.

Think of it this way: ENTRYPOINT defines what the container is, while CMD defines the default arguments for what it does.

## CMD: The Default Command

CMD specifies the default command to execute when the container starts. If a user provides arguments to `podman run`, those arguments replace the entire CMD.

```dockerfile
FROM ubuntu:22.04

CMD ["echo", "Hello from the container"]
```

Build and test:

```bash
podman build -t cmd-demo .

# Uses the default CMD

podman run cmd-demo
# Output: Hello from the container

# Overrides the entire CMD
podman run cmd-demo echo "Something else"
# Output: Something else

# Completely replaces CMD with a different command
podman run cmd-demo ls /
# Output: (directory listing)
```

CMD has three forms. The exec form is preferred:

```dockerfile
# Exec form (preferred) - runs directly without a shell
CMD ["executable", "arg1", "arg2"]

# Shell form - wraps in /bin/sh -c
CMD command arg1 arg2

# Default parameters form - used with ENTRYPOINT
CMD ["arg1", "arg2"]
```

## ENTRYPOINT: The Fixed Executable

ENTRYPOINT configures the container to run as a specific executable. Arguments passed to `podman run` are appended to the ENTRYPOINT rather than replacing it:

```dockerfile
FROM ubuntu:22.04

ENTRYPOINT ["echo"]
```

Build and test:

```bash
podman build -t entrypoint-demo .

# No arguments - echo runs with no args
podman run entrypoint-demo
# Output: (empty line)

# Arguments are appended to ENTRYPOINT
podman run entrypoint-demo "Hello World"
# Output: Hello World

# Multiple arguments
podman run entrypoint-demo "Hello" "World"
# Output: Hello World
```

ENTRYPOINT also has exec and shell forms:

```dockerfile
# Exec form (preferred) - allows CMD arguments
ENTRYPOINT ["executable", "arg1"]

# Shell form - ignores CMD and run arguments
ENTRYPOINT command arg1
```

Always use the exec form for ENTRYPOINT. The shell form wraps the command in `/bin/sh -c`, which prevents CMD arguments from being appended and causes issues with signal handling.

## Combining ENTRYPOINT and CMD

The most powerful pattern is combining both instructions. ENTRYPOINT sets the executable, and CMD provides default arguments that users can override:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .

ENTRYPOINT ["python", "manage.py"]
CMD ["runserver", "0.0.0.0:8000"]
```

This creates a flexible container:

```bash
podman build -t django-app .

# Uses default CMD args: python manage.py runserver 0.0.0.0:8000
podman run django-app

# Override CMD: python manage.py migrate
podman run django-app migrate

# Override CMD: python manage.py shell
podman run django-app shell

# Override CMD: python manage.py collectstatic
podman run django-app collectstatic
```

The container always runs `python manage.py` but lets users specify which management command to execute.

## Practical Patterns

### Pattern 1: Container as a Command-Line Tool

Make your container behave like a CLI tool:

```dockerfile
FROM alpine:3.23

RUN apk add --no-cache curl

ENTRYPOINT ["curl"]
CMD ["--help"]
```

Usage:

```bash
podman build -t my-curl .

# Shows curl help by default
podman run my-curl

# Fetch a URL
podman run my-curl -s https://api.example.com/status
```

### Pattern 2: Entrypoint Script for Initialization

Use an entrypoint script that performs setup before running the main command:

```dockerfile
FROM node:24-alpine

WORKDIR /app
RUN apk add --no-cache netcat-openbsd
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

The entrypoint script handles initialization and then passes control to CMD using `exec "$@"`:

```bash
#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database..."
until nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
  sleep 1
done
echo "Database is ready"

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running migrations..."
  node migrate.js
fi

# Execute the CMD
exec "$@"
```

The critical line is `exec "$@"`. This replaces the shell process with whatever CMD specifies, ensuring proper signal handling. Without `exec`, signals like SIGTERM would go to the shell instead of your application.

### Pattern 3: Multi-Mode Application

Create a container that can run in different modes:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENTRYPOINT ["python", "-m"]
CMD ["app.server"]
```

Usage:

```bash
# Run as web server (default)
podman run my-app

# Run as worker
podman run my-app app.worker

# Run as scheduler
podman run my-app app.scheduler

# Run tests
podman run my-app pytest
```

### Pattern 4: Using CMD Alone for General-Purpose Images

For base images or general-purpose containers where users need full flexibility, use CMD alone:

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

CMD ["/bin/bash"]
```

This lets users run any command without dealing with an ENTRYPOINT.

## The Interaction Matrix

Understanding how ENTRYPOINT and CMD interact is essential. Here is what happens with different combinations:

When only CMD is set to `["echo", "hello"]`, the container runs `echo hello`. If the user provides arguments, the entire CMD is replaced.

When only ENTRYPOINT is set to `["echo"]`, the container runs `echo` with no arguments. User arguments are appended to the entrypoint.

When ENTRYPOINT is `["echo"]` and CMD is `["hello"]`, the container runs `echo hello`. User arguments replace CMD but ENTRYPOINT remains.

When ENTRYPOINT is in shell form `echo`, CMD is ignored entirely, and user arguments are also ignored.

## Overriding at Runtime

Both ENTRYPOINT and CMD can be overridden at runtime with Podman:

```bash
# Override CMD (just pass arguments)
podman run my-image new-command arg1 arg2

# Override ENTRYPOINT
podman run --entrypoint /bin/sh my-image

# Override both
podman run --entrypoint python my-image script.py

# Clear ENTRYPOINT
podman run --entrypoint "" my-image /bin/sh -c "echo direct"
```

## Signal Handling Considerations

When using the exec form, the process runs as PID 1 and receives Unix signals directly. This is important for graceful shutdown:

```dockerfile
# Good: exec form - node receives SIGTERM directly
ENTRYPOINT ["node", "server.js"]

# Bad: shell form - /bin/sh receives SIGTERM, node may not shut down gracefully
ENTRYPOINT node server.js
```

If your application needs to handle signals properly (which most production applications do), always use the exec form and ensure your entrypoint scripts use `exec` to transfer control.

## Best Practices

Use ENTRYPOINT when your container should always run the same executable. Use CMD when you want to provide a default that users can easily override. Combine both when you want a fixed executable with flexible default arguments. Always use the exec form (JSON array syntax) for both instructions. In entrypoint scripts, always end with `exec "$@"` to pass control to CMD. Do not use the shell form of ENTRYPOINT as it breaks CMD argument passing and signal handling.

## Conclusion

ENTRYPOINT and CMD are complementary tools that give you precise control over container startup behavior. ENTRYPOINT defines the container's identity as an executable, while CMD provides sensible defaults that users can override. The entrypoint script pattern, combined with `exec "$@"`, is the gold standard for production containers that need initialization logic with flexible command execution. Master these patterns and your containers will be both robust and user-friendly.
