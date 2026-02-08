# How to Use Docker Compose restart Policy Options

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Restart Policy, Reliability, Container Management, DevOps

Description: Configure Docker Compose restart policies to keep your containers running through crashes, reboots, and unexpected failures.

---

Containers crash. Processes fail. Servers reboot. A well-configured restart policy is the difference between a service that recovers automatically and one that stays down until someone notices. Docker Compose provides four restart policy options, and choosing the right one for each service directly impacts your application's reliability.

## The Four Restart Policies

Docker Compose supports these restart policies:

- **no** - Never restart the container (the default)
- **always** - Always restart, no matter what
- **on-failure** - Restart only when the container exits with a non-zero exit code
- **unless-stopped** - Like always, but do not restart containers that were manually stopped

Let's walk through each one in detail.

## no: Never Restart

This is the default behavior. When a container exits, it stays stopped.

```yaml
# Explicit no-restart policy (same as not specifying restart at all)
services:
  one-time-task:
    image: my-migration:latest
    restart: "no"
    command: ["python", "migrate.py"]
```

Use `"no"` (with quotes in YAML, since bare `no` is interpreted as a boolean `false`) for:

- One-time tasks like database migrations
- Batch jobs that should run once and finish
- Debug containers you want to inspect after they exit
- Init containers that prepare data for other services

## always: Restart No Matter What

The `always` policy restarts the container regardless of the exit code. It even restarts containers after a Docker daemon restart or host reboot.

```yaml
# Always restart - the most aggressive policy
services:
  critical-api:
    image: my-api:latest
    restart: always
    ports:
      - "8080:8080"
```

With `always`, the container restarts whether it exited cleanly (exit code 0) or with an error (non-zero exit code). Docker uses an exponential backoff for restarts, starting at 100 milliseconds and doubling each time, up to a cap. The backoff resets once the container stays running for at least 10 seconds.

```bash
# Observe the restart behavior
docker events --filter container=my-api --filter event=restart
```

**When to use always:** Services that must be available continuously and where a clean exit still means "restart me." Good for web servers, API gateways, and reverse proxies.

**When to avoid always:** Containers with configuration errors will restart in a loop forever, consuming resources. If your container exits immediately every time, `always` turns into an infinite restart loop.

## on-failure: Restart Only on Errors

This policy only restarts the container when it exits with a non-zero exit code. A clean exit (code 0) means the container stays stopped.

```yaml
# Restart only when the process fails
services:
  worker:
    image: my-worker:latest
    restart: on-failure
```

You can also specify a maximum number of retries.

```yaml
# Restart on failure, but give up after 5 attempts
services:
  worker:
    image: my-worker:latest
    restart: "on-failure:5"
```

With the retry limit, Docker will attempt to restart the container up to 5 times. If it keeps failing, Docker gives up and leaves the container stopped. This prevents infinite restart loops for containers with persistent errors.

```bash
# Check how many times a container has restarted
docker inspect --format='{{.RestartCount}}' my-worker

# See the last restart time
docker inspect --format='{{.State.StartedAt}}' my-worker
```

**When to use on-failure:** Background workers, queue consumers, scheduled tasks that should retry on failure but stay stopped when they finish successfully.

## unless-stopped: Restart Until Manually Stopped

This is the most practical policy for production services. It works like `always`, but respects manual stops. If you run `docker stop my-container`, the container stays stopped even after a Docker daemon restart.

```yaml
# Restart unless manually stopped
services:
  web:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
```

The key difference from `always`:

- **always**: Container restarts even after you manually stop it (when the daemon restarts)
- **unless-stopped**: Container stays stopped if you manually stopped it

This matters during maintenance. When you stop a container for maintenance with `docker stop`, you do not want it to spring back to life when Docker restarts.

**When to use unless-stopped:** This is the best general-purpose policy for most production services. It gives you automatic recovery while respecting manual interventions.

## Restart Behavior During docker compose down and up

Understanding how restart policies interact with Compose commands is important.

```bash
# docker compose down - Stops AND removes containers
# Restart policies do not apply because containers are removed
docker compose down

# docker compose stop - Stops containers but keeps them
# unless-stopped remembers this and won't auto-restart
docker compose stop

# docker compose up -d - Creates and starts containers
# Starts fresh, restart policy applies from this point
docker compose up -d

# docker compose restart - Restarts running containers
# Does not change the restart policy state
docker compose restart
```

## Choosing the Right Policy for Each Service

Different services in your stack need different policies. Here is a complete example.

```yaml
# Multi-service stack with appropriate restart policies
version: "3.8"

services:
  # Web server - should always be available
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api

  # API server - should always be available
  api:
    build: ./api
    restart: unless-stopped
    expose:
      - "3000"
    depends_on:
      - postgres
      - redis

  # Database - should always be available
  postgres:
    image: postgres:16
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Cache - should always be available
  redis:
    image: redis:7-alpine
    restart: unless-stopped

  # Background worker - restart on failure only
  worker:
    build: ./worker
    restart: on-failure:10
    depends_on:
      - redis
      - postgres

  # Database migration - run once and stop
  migrate:
    build: ./migrate
    restart: "no"
    depends_on:
      - postgres
    command: ["npm", "run", "migrate"]

  # Scheduled backup - restart on failure
  backup:
    image: my-backup:latest
    restart: on-failure:3
    volumes:
      - pgdata:/data/postgres:ro
      - backup-data:/backups

volumes:
  pgdata:
  backup-data:
```

## Restart Policy with Healthchecks

Restart policies and healthchecks work together. A container marked unhealthy does not automatically get restarted by Docker (that is a common misconception). However, you can use orchestration tools or external monitors to restart unhealthy containers.

```yaml
# Combining restart policy with healthcheck
services:
  api:
    image: my-api:latest
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

If you want automatic restarts based on health status, you need Docker Swarm mode or an external process.

```bash
# Simple script to restart unhealthy containers
# (run this as a cron job or systemd timer)
docker ps --filter health=unhealthy --format "{{.Names}}" | xargs -r docker restart
```

## Monitoring Restart Behavior

Keep an eye on container restarts to catch services that are flapping (repeatedly crashing and restarting).

```bash
# Check restart count for all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Get detailed restart info
docker inspect --format='Name: {{.Name}} RestartCount: {{.RestartCount}} State: {{.State.Status}}' $(docker ps -aq)

# Watch for restart events in real time
docker events --filter event=restart --filter event=die --filter event=start

# Get the exit code of the last run
docker inspect --format='{{.State.ExitCode}}' my-container
```

## Common Exit Codes and What They Mean

Understanding exit codes helps you choose between `always` and `on-failure`.

| Exit Code | Meaning | Example |
|---|---|---|
| 0 | Success | Clean shutdown, task completed |
| 1 | General error | Application error, unhandled exception |
| 137 | SIGKILL (OOM or docker kill) | Out of memory, forced stop |
| 139 | Segmentation fault | Memory access violation |
| 143 | SIGTERM | Graceful shutdown request |

Exit code 143 deserves special attention. When Docker stops a container, it sends SIGTERM first. If your application handles SIGTERM and exits cleanly, the exit code is 143. With `on-failure`, this means the container will not restart after a `docker stop`, which is usually what you want.

```bash
# Check why a container exited
docker inspect --format='ExitCode: {{.State.ExitCode}} Error: {{.State.Error}}' my-container
```

## Restart Policies in Production

For production deployments, I recommend these guidelines:

1. Use `unless-stopped` as your default for long-running services
2. Use `on-failure` with a retry limit for workers and batch processors
3. Use `"no"` for one-shot tasks like migrations and setup scripts
4. Avoid `always` unless you specifically need containers to restart even after manual stops
5. Always set log rotation alongside restart policies to prevent log accumulation from restarting containers

```yaml
# Production-ready service with restart and logging
services:
  api:
    image: my-api:latest
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "25m"
        max-file: "5"
```

A well-chosen restart policy costs nothing to configure but saves you from 3 AM pages. Take five minutes to set the right policy for each service in your stack and your on-call rotation will thank you.
