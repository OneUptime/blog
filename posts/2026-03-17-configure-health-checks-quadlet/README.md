# How to Configure Health Checks in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Health Check, Monitoring

Description: Learn how to configure container health checks in Podman Quadlet files to monitor application readiness and liveness.

---

> Define health checks in your Quadlet container files to let Podman automatically monitor whether your containerized applications are running correctly.

Health checks allow Podman to periodically run a command inside the container to determine if the application is healthy. Quadlet exposes several health check directives that map to Podman's built-in health check capabilities.

---

## Basic Health Check Configuration

Add a health check command in the `[Container]` section:

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application with health check

[Container]
Image=docker.io/library/nginx:latest
ContainerName=webapp
PublishPort=8080:80

# Health check configuration
HealthCmd=nginx -t || exit 1
HealthInterval=30s
HealthTimeout=10s
HealthRetries=3
HealthStartPeriod=15s

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Understanding Health Check Directives

| Directive | Description | Default |
|-----------|-------------|---------|
| `HealthCmd` | Command to run inside the container | None |
| `HealthInterval` | Time between checks | 30s |
| `HealthTimeout` | Maximum time for a check to complete | 30s |
| `HealthRetries` | Consecutive failures before unhealthy | 3 |
| `HealthStartPeriod` | Grace period for container startup | 0s |

## Health Check for a Database Container

```ini
# ~/.config/containers/systemd/postgres.container
[Unit]
Description=PostgreSQL with health check

[Container]
Image=docker.io/library/postgres:16
Environment=POSTGRES_PASSWORD=mysecretpassword
Volume=pgdata.volume:/var/lib/postgresql/data
PublishPort=5432:5432

# Check if PostgreSQL is ready to accept connections
HealthCmd=pg_isready -U postgres || exit 1
HealthInterval=15s
HealthTimeout=5s
HealthRetries=5
HealthStartPeriod=30s

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Health Check for a Redis Container

```ini
# ~/.config/containers/systemd/redis.container
[Unit]
Description=Redis with health check

[Container]
Image=docker.io/library/redis:7
PublishPort=6379:6379

HealthCmd=redis-cli ping | grep -q PONG || exit 1
HealthInterval=10s
HealthTimeout=5s
HealthRetries=3
HealthStartPeriod=10s

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Checking Health Status

```bash
# Reload and start the service
systemctl --user daemon-reload
systemctl --user start webapp.service

# Check the health status
podman healthcheck run webapp

# View health status in container inspect
podman inspect webapp --format '{{.State.Health.Status}}'

# View health check log
podman inspect webapp --format '{{json .State.Health}}' | python3 -m json.tool
```

## Summary

Health checks in Quadlet container files let Podman monitor your applications automatically. Configure the check command, interval, timeout, retries, and start period to match your application's behavior. Use `podman healthcheck run` and `podman inspect` to verify health status.
