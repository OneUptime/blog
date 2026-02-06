# Docker Restart Policies: Auto-Recover Containers After Crashes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Reliability, High Availability

Description: Configure Docker restart policies (always, unless-stopped, on-failure) for automatic container recovery. Essential for production high availability.

---

Containers crash. Servers reboot. Applications fail. Docker restart policies ensure your containers automatically recover without manual intervention, providing a foundation for reliable container deployments.

## Available Restart Policies

Docker provides four restart policies:

| Policy | Behavior |
|--------|----------|
| `no` | Never restart (default) |
| `always` | Always restart, including after daemon restart |
| `unless-stopped` | Always restart, except if manually stopped |
| `on-failure[:max-retries]` | Restart only on non-zero exit code |

## The `no` Policy (Default)

By default, containers don't restart automatically.

```bash
docker run --restart no nginx
# Or simply (no is the default)
docker run nginx
```

Use this for:
- One-off tasks and batch jobs
- Development environments
- Containers managed by external orchestrators

## The `always` Policy

The container restarts regardless of exit status and starts when the Docker daemon starts.

```bash
docker run -d --restart always --name web nginx
```

This means:
- Container restarts after any crash
- Container starts automatically after system reboot
- Container starts when Docker daemon restarts
- Even manually stopped containers restart when daemon restarts

The last point is important: if you `docker stop web`, the container stays stopped. But if you reboot the server or restart Docker, the container starts again.

## The `unless-stopped` Policy

Similar to `always`, but respects manual stops across daemon restarts.

```bash
docker run -d --restart unless-stopped --name web nginx
```

The difference from `always`:
- If you manually stop the container, it stays stopped even after daemon restart
- Gives you control to intentionally stop containers for maintenance

This is typically the best choice for production services.

### Comparison: `always` vs `unless-stopped`

```bash
# Start two containers with different policies
docker run -d --restart always --name always-web nginx
docker run -d --restart unless-stopped --name unless-web nginx

# Stop both
docker stop always-web unless-web

# Restart Docker daemon
sudo systemctl restart docker

# Check status
docker ps
# always-web: Running (restarted automatically)
# unless-web: Stopped (stayed stopped as requested)
```

## The `on-failure` Policy

Restart only when the container exits with a non-zero exit code. Optionally limit restart attempts.

```bash
# Restart on failure, unlimited retries
docker run -d --restart on-failure my-app

# Restart on failure, max 5 retries
docker run -d --restart on-failure:5 my-app
```

Exit code behavior:
- Exit 0 (success): Container stays stopped
- Exit non-zero (failure): Container restarts

This is ideal for:
- Batch jobs that should retry on failure
- Services where graceful shutdown should stay stopped
- Situations where you want to limit restart loops

### Checking Restart Count

```bash
docker inspect --format='{{.RestartCount}}' my-container
# Output: 3

# More detailed info
docker inspect --format='{{json .RestartCount}} restarts, last at {{.State.StartedAt}}' my-container
```

## Docker Compose Configuration

Set restart policies in your `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    image: nginx
    restart: unless-stopped

  api:
    image: my-api
    restart: on-failure:10

  database:
    image: postgres
    restart: always

  one-time-task:
    image: migration-runner
    restart: "no"
```

## Restart Backoff and Timing

Docker implements exponential backoff for restarts to prevent rapid restart loops:

1. First restart: immediate
2. Second restart: 100ms delay
3. Third restart: 200ms delay
4. Fourth restart: 400ms delay
5. And so on, doubling each time up to a maximum of 1 minute

This prevents a crashing container from consuming excessive resources with rapid restart attempts.

### Resetting Restart Count

The restart count resets after the container runs successfully for 10 seconds. You can also manually reset it:

```bash
# Stop and remove, then recreate
docker stop my-container
docker rm my-container
docker run -d --restart unless-stopped --name my-container my-image
```

## Changing Restart Policy on Running Containers

Update the restart policy without recreating the container:

```bash
# Change to always
docker update --restart always my-container

# Change to unless-stopped
docker update --restart unless-stopped my-container

# Disable restarts
docker update --restart no my-container

# Set on-failure with max retries
docker update --restart on-failure:5 my-container
```

## Best Practices

### Production Services: Use `unless-stopped`

```bash
docker run -d \
  --restart unless-stopped \
  --name production-api \
  my-api:latest
```

This provides automatic recovery while allowing intentional maintenance stops.

### Database Containers: Use `always`

```bash
docker run -d \
  --restart always \
  --name postgres \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15
```

Databases should almost always be running. The `always` policy ensures they start even if someone accidentally stopped them.

### Batch Jobs: Use `on-failure`

```bash
docker run -d \
  --restart on-failure:3 \
  --name nightly-backup \
  backup-script
```

The job retries up to 3 times on failure but stays stopped after successful completion.

### Combine with Health Checks

Restart policies work well with health checks. An unhealthy container that crashes will trigger a restart:

```bash
docker run -d \
  --restart unless-stopped \
  --health-cmd "curl -f http://localhost/health || exit 1" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  --name web \
  my-web-app
```

## When Not to Use Restart Policies

Avoid restart policies when:

1. **Using Kubernetes or Swarm**: These orchestrators manage container lifecycle themselves
2. **Running one-off commands**: `docker run --rm` is better for temporary containers
3. **Debugging crashes**: Disable restarts to preserve crash state for investigation

```bash
# Temporarily disable for debugging
docker update --restart no crashing-container

# Investigate
docker logs crashing-container
docker inspect crashing-container

# Re-enable after fixing
docker update --restart unless-stopped crashing-container
```

## Summary

| Use Case | Recommended Policy |
|----------|-------------------|
| Production web services | `unless-stopped` |
| Databases | `always` |
| Batch jobs with retry | `on-failure:N` |
| Development | `no` |
| Critical infrastructure | `always` |
| Jobs that run to completion | `on-failure` (no limit) |

Restart policies are a simple but powerful tool for container reliability. For most production services, `unless-stopped` provides the right balance of automatic recovery and manual control.
