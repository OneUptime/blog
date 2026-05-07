# How to Use the health-on-failure Option in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Failure Handling

Description: Learn how to use the --health-on-failure option in Podman to automatically take action when a container becomes unhealthy.

---

> The `--health-on-failure` option tells Podman what action to take automatically when a container transitions to an unhealthy state, enabling self-healing containers.

By default, Podman simply marks a container as unhealthy when health checks fail but takes no further action. The `--health-on-failure` option changes this behavior, allowing Podman to automatically restart, stop, or kill unhealthy containers.

---

## Available Failure Actions

Podman supports four actions when a health check fails:

```bash
# none (default): Just mark as unhealthy, take no action

podman run -d --name app1 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure none \
  my-app:latest

# restart: Restart the container automatically
podman run -d --name app2 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure restart \
  my-app:latest

# stop: Stop the container
podman run -d --name app3 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure stop \
  my-app:latest

# kill: Kill the container immediately
podman run -d --name app4 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure kill \
  my-app:latest
```

## Using restart for Self-Healing

The most common use case is automatic restart:

```bash
# Self-healing web service
podman run -d \
  --name self-healing-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 30s \
  --health-on-failure restart \
  my-web-app:latest
```

## Using with Restart Policy

Do not combine `--health-on-failure restart` with the `--restart` flag. If the container is managed by systemd, use the restart policy there and choose `kill` or `stop` for the health failure action:

```bash
# Use health-on-failure with systemd restart policies
podman run -d \
  --name resilient-service \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval 20s \
  --health-retries 3 \
  --health-on-failure kill \
  resilient-service:latest
```

## When to Use Each Action

```bash
# Use 'restart' for stateless services that can recover by restarting
podman run -d --name api-server \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure restart \
  api-server:latest

# Use 'stop' for services managed by an external orchestrator
podman run -d --name managed-service \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure stop \
  managed-service:latest

# Use 'kill' for services that need immediate termination
podman run -d --name critical-service \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-on-failure kill \
  critical-service:latest
```

## Inspecting the Configuration

```bash
# Check the configured on-failure action
podman inspect --format='{{.Config.HealthcheckOnFailureAction}}' self-healing-app
```

## Summary

The `--health-on-failure` option extends Podman health checks beyond passive monitoring into active remediation. Use `restart` for self-healing stateless services, `stop` when an external system manages recovery, and `kill` for immediate termination. Combined with appropriate retry counts and intervals, this creates a robust self-healing container setup without requiring external orchestration tools.
