# How to Configure Container Restart Policies in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Reliability, DevOps

Description: Learn how to configure Docker container restart policies in Portainer to ensure your applications automatically recover from failures and reboots.

## Introduction

A restart policy determines what Docker does when a container exits - whether from a crash, an error, or a system reboot. Configuring the right restart policy is essential for production deployments. Portainer makes it easy to set restart policies through the web UI.

## Prerequisites

- Portainer installed with a connected Docker environment

## Available Restart Policies

Docker supports four restart policies:

| Policy | Description |
|--------|-------------|
| `no` | Do not restart the container (default) |
| `on-failure` | Restart only if exit code is non-zero (failure) |
| `always` | Always restart the container |
| `unless-stopped` | Always restart unless the container was already stopped |

## Setting Restart Policies in Portainer

### During Container Creation

1. Navigate to **Containers > Add container**.
2. Fill in the name and image.
3. Scroll to the **Restart policy** section.
4. Select the desired policy from the dropdown.

### For Existing Containers

In Portainer, changing the restart policy for an existing container recreates the container with the updated settings:

1. Navigate to the container.
2. Click **Duplicate/Edit**.
3. Update the restart policy.
4. Click **Deploy the container**.

## Restart Policy Deep Dive

### `no` - No Restart

```yaml
# compose.yaml equivalent:

services:
  one-shot-task:
    image: myorg/data-migrator:latest
    restart: "no"   # Run once, don't restart
```

Use for:
- One-time migration or initialization jobs
- Manual tasks you want to run explicitly
- Development containers you restart manually

### `on-failure` - Restart on Non-Zero Exit

```yaml
services:
  app:
    image: myorg/myapp:latest
    restart: on-failure
    # Optionally limit the number of restart attempts:
    # restart: on-failure:5   (max 5 retries)
```

Use for:
- Applications where exit code 0 means intentional stop (don't restart)
- Batch jobs that should retry on failure but stop when done
- Applications that may need external intervention after multiple failures

### `always` - Always Restart

```yaml
services:
  web:
    image: nginx:alpine
    restart: always
```

Behavior:
- Restarts even if the container exited with code 0.
- **Restarts after Docker daemon restart or system reboot**.
- If you stop it manually, it stays stopped until the Docker daemon restarts or you start the container again yourself.

Use for:
- Core production services that must always run
- Services that start with the system

### `unless-stopped` - Always Restart Unless Manually Stopped

```yaml
services:
  api:
    image: myorg/api:latest
    restart: unless-stopped
```

Behavior:
- Same as `always` except: if the container was already in a stopped state before the Docker daemon restarts or the host reboots, it won't be started automatically.
- This is often the most practical choice for production services.

Use for:
- Production services you may need to temporarily stop for maintenance
- Services where you want control over restart behavior without losing the "starts on boot" benefit

## Restart Policy and Docker Compose

In Docker Compose files (used by Portainer Stacks):

```yaml
services:
  # Always running - restart after reboot
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  # Always running web server
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"

  # One-time migration - don't restart
  migrate:
    image: myorg/migrate:latest
    restart: "no"
    depends_on:
      - postgres
```

## Restart Delay and Backoff

Docker adds an increasing delay between restart attempts to prevent rapid restart loops from overwhelming the system.

```bash
# Check restart count and last state
docker inspect --format '{{.RestartCount}} {{.State.Status}}' my-container

# In Portainer, use Inspect or Logs to investigate repeated restarts
```

## Monitoring Restart Loops

If a container is constantly restarting ("restart loop"), use Portainer to inspect its status and review the logs:

1. Navigate to the container in Portainer.
2. Click **Inspect** to review the container state, or use `docker inspect` to check `RestartCount`.
3. Click **Logs** to see why the container is failing.
4. Fix the underlying issue before repeated restarts continue.

## Choosing the Right Policy

```text
One-time job or migration:     restart: "no"
Development container:         restart: "no" or on-failure
Production service (normal):   restart: unless-stopped
Critical infrastructure:       restart: always
Batch job with retry:          restart: on-failure:5
```

## Conclusion

Restart policies are a simple but critical configuration for container reliability. For production services, `unless-stopped` is usually the right choice - it ensures your service survives crashes and reboots, while giving you the ability to stop it intentionally during maintenance. Use `always` when you want a service to come back automatically when Docker restarts, even if it had been manually stopped before that restart.
