# How to Configure Container Health Checks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Health Check, Monitoring, Reliability, DevOps

Description: Define and configure Docker container health checks in Portainer stacks to enable automatic restart on failure, proper depends_on ordering, and health status visibility in the Portainer dashboard.

---

Health checks tell Docker (and Portainer) whether a container is actually functioning correctly, not just running. Portainer surfaces container health information, and Compose-based stack deployments can use health checks with `depends_on` conditions such as `service_healthy`.

## Health Check States

A container can be in one of these health-related states:

- **starting** - the container is still in its health check startup phase
- **healthy** - the most recent health check passed
- **unhealthy** - the container reached the configured `retries` threshold for consecutive failures
- **no health check** - no health check is defined for the container

## Defining Health Checks in Portainer Stacks

### HTTP Health Check

For web services:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    healthcheck:
      # HTTP endpoint that returns a successful response when healthy
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s        # Check every 30 seconds
      timeout: 10s         # Fail if no response in 10 seconds
      retries: 3           # Mark unhealthy after 3 consecutive failures
      start_period: 40s    # Grace period during startup
```

### TCP Port Check

For databases and services without HTTP endpoints:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      # pg_isready returns 0 when PostgreSQL is accepting connections
      test: ["CMD-SHELL", "pg_isready -h localhost -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

### Redis Health Check

```yaml
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
```

### Custom Health Check Script

For complex checks:

```yaml
  app:
    image: myapp:1.2.3
    healthcheck:
      test: ["CMD", "/usr/local/bin/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
#!/bin/sh
# healthcheck.sh - inside the container

# Returns 0 for healthy, 1 for unhealthy

# Check HTTP endpoint
curl -sf http://localhost:8080/health || exit 1

# Check required file exists
test -f /app/config/runtime.json || exit 1

# Check database connectivity
pg_isready -h postgres || exit 1

exit 0
```

## Health Check Parameters Explained

| Parameter | Default | Description |
|-----------|---------|-------------|
| `interval` | 30s | Time between checks |
| `timeout` | 30s | Max time for check to complete |
| `retries` | 3 | Failures before marking unhealthy |
| `start_period` | 0s | Grace period before checks count |

Set `start_period` to at least the expected startup time of your application. During `start_period`, failed checks are not counted toward `retries`.

## Viewing Health Status in Portainer

In Portainer's **Containers** list, you can see the container's status.

Click a container to open the **Inspect** tab and view the raw container data, including health check details when a health check is defined.

## Health Checks and Restart Policies

Combine health checks with restart policies so the container is restarted if its main process exits:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    restart: unless-stopped    # Restart if the container exits
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      retries: 3
```

A Docker health check only updates the container's health status; it does not restart the container by itself. Restart policies apply when the container exits. This differs from Kubernetes liveness probes.

## Summary

Container health checks are a fundamental reliability feature. Define them for all production services in your Portainer stacks - especially databases and API services. Portainer's health status display gives immediate visibility into container health, and Compose-based dependency ordering can wait for services to become healthy before starting dependents.
