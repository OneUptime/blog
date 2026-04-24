# How to Override Container Command and Entrypoint in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Configuration, DevOps

Description: Learn how to override the default command and entrypoint of a Docker container in Portainer to customize container startup behavior.

## Introduction

Every Docker image has a default command and/or entrypoint defined in its Dockerfile. Sometimes you need to override these defaults - to run a different subcommand, pass custom arguments, run a shell for debugging, or execute a migration before starting the app. Portainer provides fields to override both the command and entrypoint when creating or re-creating containers.

## Prerequisites

- Portainer installed with a connected Docker environment
- Understanding of Docker's CMD vs ENTRYPOINT distinction

## CMD vs ENTRYPOINT - A Quick Refresher

```dockerfile
# In a Dockerfile:

# ENTRYPOINT sets the main executable (hard to override)

ENTRYPOINT ["python", "app.py"]

# CMD sets default arguments (easy to override)
CMD ["--port", "8080"]

# Combined: runs "python app.py --port 8080" by default
# Override CMD to change arguments: "python app.py --port 9090"
# Override ENTRYPOINT to change the executable entirely: "/bin/sh"
```

## Step 1: Access Command Settings in Portainer

1. Navigate to **Containers > Add container**.
2. Scroll to the **Advanced container settings** section, then the **Command & logging** area.

You'll find two fields:
- **Command**: Override the Docker image's `CMD` or supply new arguments to its `ENTRYPOINT`.
- **Entrypoint**: Override the Docker image's `ENTRYPOINT`.

## Step 2: Override the Command

The command overrides the image's default `CMD`. If the image also defines an `ENTRYPOINT`, the command is passed to that entrypoint as arguments unless you override the entrypoint too. Common uses:

### Running a Different Subcommand

```text
# Image: redis:7
# Default command: redis-server
# Override to run redis-cli:
Command: redis-cli --version

# Image: postgres:15
# Default command: postgres
# Override to run pg_dump:
Command: pg_dump -U postgres -d mydb
```

### Passing Extra Arguments

```text
# Image: nginx:alpine
# Default: nginx -g 'daemon off;'
# Override to change config file:
Command: nginx -g 'daemon off;' -c /custom/nginx.conf

# Image: node:20
# Override to run a specific script:
Command: node scripts/seed-database.js
```

### Override with Shell Commands

```text
# Run multiple commands via shell
Entrypoint: /bin/sh
Command: -c "sleep 5 && node server.js"
```

## Step 3: Override the Entrypoint

Overriding the entrypoint replaces the main executable. This is more disruptive but useful for debugging:

### Open a Shell Instead of Starting the App

```text
# Override entrypoint to use a shell as PID 1
Entrypoint: /bin/sh
Command: -c "sleep infinity"
# Then use Portainer's Console feature to open a shell
```

### Run as a Script Wrapper

```text
# Original entrypoint: /app/start.sh
# Override to use a custom script with initialization:
Entrypoint: /app/custom-entrypoint.sh
Command: --config /app/custom.conf
```

### Bypass Entrypoint Entirely

```text
# For a container with ENTRYPOINT ["gunicorn"]
# Override to run Python directly:
Entrypoint: python
Command: manage.py migrate
```

## Real-World Examples

### Running a Database Migration Before Starting

```yaml
# docker-compose.yml pattern: run migration as a separate container
services:
  # Run migrations first, then start app
  migrate:
    image: myorg/myapp:latest
    restart: "no"
    # Override the default app start command with migrations
    command: ["python", "manage.py", "migrate", "--noinput"]
    environment:
      - DATABASE_URL=${DATABASE_URL}

  app:
    image: myorg/myapp:latest
    restart: unless-stopped
    depends_on:
      migrate:
        condition: service_completed_successfully
```

### Debugging a Crashing Container

```bash
# Container crashes on start - keep the container running with a shell entrypoint
Entrypoint: /bin/sh
Command: -c "sleep infinity"
```

In Portainer, a practical debugging flow is:
1. Set the entrypoint to `/bin/sh` and command to `-c "sleep infinity"`.
2. Start the container.
3. Use **Exec/Console** to attach a shell.
4. Investigate the issue.

### Running a Cron Job Container

```yaml
services:
  cron-job:
    image: myorg/myapp:latest
    command: ["python", "cron.py", "--job", "cleanup-old-records"]
    restart: "no"
```

## Step 4: Verify the Override

After creating the container:

1. Navigate to the container in Portainer.
2. Click the **Inspect** tab.
3. Look for `Config.Cmd` and `Config.Entrypoint` in the JSON.

```json
{
  "Config": {
    "Entrypoint": ["/bin/sh"],
    "Cmd": ["-c", "sleep infinity"]
  }
}
```

## Command Format in Portainer

In Portainer, the **Command** and **Entrypoint** fields are entered as strings. Portainer splits the value into arguments, keeping quoted sections together:

```text
# Simple command
Command: python app.py --port 8080

# If you need shell features like &&, explicitly invoke a shell
Entrypoint: /bin/sh
Command: -c "echo hello && sleep 10"
```

JSON array syntax such as `["python", "app.py", "--port", "8080"]` is used in Dockerfiles and Compose files, not in Portainer's container form.

## Conclusion

Overriding commands and entrypoints in Portainer gives you fine-grained control over container startup behavior. This is essential for running one-off tasks, debugging failing containers, executing migrations, or passing environment-specific arguments to your application - all without modifying the Docker image itself.
