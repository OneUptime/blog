# How to Configure Docker Swarm Service Health Checks with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Health Check, Container Management, DevOps

Description: Learn how to configure health checks for Docker Swarm services using Portainer, ensuring unhealthy containers are automatically detected and replaced.

## Introduction

Health checks allow Docker Swarm to automatically detect when a service container is not functioning correctly and replace the failed task. Portainer can deploy Swarm stack files that define health checks, and Docker applies those settings to the service tasks.

## Configuring Health Checks via Portainer

For Docker Swarm services, configure health checks in the stack YAML you deploy through Portainer. Portainer's Services UI lets you add, update, inspect, and view service tasks, but the current Portainer service documentation does not list a dedicated health-check form for Swarm services.

When defining the `healthcheck` block, configure:

- **Command**: the test command (e.g., `curl -f http://localhost/health`)
- **Interval**: how often to run the check (e.g., `30s`)
- **Timeout**: how long to wait for a response (e.g., `10s`)
- **Retries**: how many failures before marking unhealthy (e.g., `3`)
- **Start period**: grace period for startup (e.g., `60s`)

Make sure the command uses tools available in the container image, such as `curl`, `wget`, or an application-specific health-check binary.

## Defining Health Checks in a Stack File

Deploy via Portainer using a stack YAML with health check defined:

```yaml
version: "3.8"

services:
  web:
    image: nginx:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 3m
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    ports:
      - "80:80"
```

## Health Check for a Custom Application

```yaml
services:
  api:
    image: myapp:latest
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s
```

## Monitoring Health Status in Portainer

After deploying:

1. Go to **Services** and expand your service's task list
2. Click on a task to open its container details and view health status when a health check is configured
3. Health states shown: `healthy`, `unhealthy`, `starting`

## Viewing Health Check Logs

Health-check command output is stored in Docker's health status, not the normal container log stream. In Portainer, open the service task's container details or inspect view. Alternatively via CLI:

```bash
docker inspect --format='{{json .State.Health}}' <container_id>
```

## Swarm Rolling Updates with Health Checks

Swarm respects health checks during rolling updates. If a new task becomes unhealthy within the update monitor window, the update stops and can roll back. Set `monitor` long enough to cover the health check's start period, interval, retries, and timeout:

```yaml
deploy:
  update_config:
    failure_action: rollback
    monitor: 3m
```

## Conclusion

Configuring health checks for Docker Swarm services in Portainer ensures your applications are continuously monitored and automatically recovered from failed tasks. By combining health checks with Swarm's update policies, you can achieve safer rolling deployments with automatic rollback on failure.
