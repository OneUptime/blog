# How to Set Up Service Update Configuration in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Update, Service, DevOps

Description: Learn how to configure rolling update policies for Docker Swarm services in Portainer for zero-downtime deployments.

## Introduction

The service update configuration in Docker Swarm controls how new versions are deployed - how many replicas update simultaneously, how long to wait between batches, and what to do if an update fails. Portainer exposes these settings through its service editor, letting you configure rolling updates and, for compatible services, zero-downtime deployments. This guide covers all update configuration options.

## Prerequisites

- Portainer on Docker Swarm
- A service with multiple replicas
- Understanding of service rollback (see the rollback guide)

## Update Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `parallelism` | How many replicas to update at once | 1 |
| `delay` | Time to wait between update batches | 0s |
| `failure_action` | What to do if update fails (`continue`, `pause`, `rollback`) | `pause` |
| `monitor` | Time to monitor after each batch before moving to next | 5s |
| `max_failure_ratio` | Maximum allowed proportion of failed tasks | 0.0 |
| `order` | Task replacement order (`stop-first` or `start-first`) | `stop-first` |

## Understanding `stop-first` vs `start-first`

### stop-first (Default)

```text
Replica 1: Stop old → Start new (brief downtime if only 1 replica)
Replica 2: Stop old → Start new
```

Best for: Services where running 2 versions simultaneously would cause issues (e.g., database migrations).

### start-first (Can Avoid Downtime)

```text
Replica 1: Start new → Old and new overlap briefly → Stop old
Replica 2: Start new → Old and new overlap briefly → Stop old
```

Best for: Stateless web services and APIs that can tolerate old and new tasks briefly overlapping. Requires enough capacity for N+parallelism containers.

## Step 1: Configure Update Policy in Portainer

When creating or editing a service:

1. Scroll to **Update/Rollback config**
2. Set update configuration:

```text
Update configuration:
  Parallelism:         2
  Delay:               10s
  Failure action:      rollback
  Monitor:             30s
  Max failure ratio:   0.1    (10%)
  Order:               start-first
```

## Step 2: Configure in a Compose File

```yaml
version: "3.8"

services:
  # Web service using overlap-based updates
  web:
    image: nginx:alpine
    deploy:
      replicas: 4
      update_config:
        parallelism: 1         # Update 1 at a time
        delay: 10s             # 10s between updates
        failure_action: rollback  # Auto-rollback on failure
        monitor: 30s           # Monitor 30s per batch
        max_failure_ratio: 0.1 # Allow up to 10% failure rate
        order: start-first     # Start new task before stopping old

  # API with health checks and a longer monitor window
  api:
    image: myapi:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 60s     # Grace period for API startup
    deploy:
      replicas: 6
      update_config:
        parallelism: 2       # 2 at a time
        delay: 15s
        failure_action: rollback
        monitor: 60s         # Monitor long enough to catch startup failures
        max_failure_ratio: 0.2
        order: start-first

  # Stateful service: careful sequential updates
  redis:
    image: redis:7
    deploy:
      replicas: 3
      update_config:
        parallelism: 1       # One at a time for stateful workloads
        delay: 30s           # Wait for Redis to stabilize
        failure_action: pause  # Pause (not rollback) for manual review
        monitor: 60s
        order: stop-first    # Avoid overlapping old and new tasks
```

## Step 3: Production Update Strategies

### Conservative Strategy (High-Reliability Services)

```yaml
update_config:
  parallelism: 1           # One at a time
  delay: 30s               # 30s wait
  failure_action: rollback # Auto-rollback
  monitor: 120s            # 2 min monitoring window
  max_failure_ratio: 0.0   # Zero tolerance for failures
  order: start-first
```

### Balanced Strategy (Standard Applications)

```yaml
update_config:
  parallelism: 2
  delay: 10s
  failure_action: rollback
  monitor: 30s
  max_failure_ratio: 0.1
  order: start-first
```

### Fast Strategy (Low-Risk Changes, Dev/Staging)

```yaml
update_config:
  parallelism: 0           # Update all at once
  delay: 0s
  failure_action: continue # Keep going even if some fail
  monitor: 0s
  order: start-first
```

## Step 4: Trigger a Service Update

### Via Portainer

1. Click **Edit** on the service
2. Change the image tag or other configuration
3. Click **Update the service**

### Via CLI

```bash
# Update to a new image version

docker service update \
  --image myapp:v2.0 \
  my-service

# Force a rolling restart without changing the image
docker service update --force my-service

# Update only the update config, not the image
docker service update \
  --update-parallelism 2 \
  --update-delay 10s \
  my-service
```

## Step 5: Monitor the Rolling Update

Watch the update progress in Portainer's service detail → Tasks, or from CLI:

```bash
# Watch update progress
watch docker service ps my-service

# Expected rolling update pattern:
# NAME        IMAGE     NODE       STATE          PORTS
# service.1   app:v2    worker-01  Running        (new)
# \_ service.1 app:v1   worker-01  Shutdown       (old, being replaced)
# service.2   app:v2    worker-02  Running
# service.3   app:v1    worker-03  Running        (not yet updated)
# service.4   app:v1    worker-04  Running        (not yet updated)
```

## Step 6: Handle a Paused Update

If you need to intervene during an update:

```bash
# Resume a paused update after fixing the issue
docker service update my-service

# Or roll back to the previous service spec
docker service rollback my-service

# Check update state
docker service inspect --format '{{.UpdateStatus.State}}' my-service
# Example output while paused:
# paused
```

## Conclusion

Service update configuration is how you achieve safe, low-downtime deployments in Docker Swarm. By using `start-first` order where appropriate, `rollback` failure action, and appropriate monitoring windows, you can deploy new versions with confidence knowing that failures during the monitored update window can trigger an automatic rollback. Configure your update policy based on the risk tolerance and availability requirements of each service.
