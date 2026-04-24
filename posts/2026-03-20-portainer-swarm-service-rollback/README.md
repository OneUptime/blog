# How to Set Up Service Rollback in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Rollback, Service, DevOps

Description: Learn how to configure automatic and manual rollback for Docker Swarm services in Portainer to recover quickly from failed deployments.

## Introduction

Service rollback in Docker Swarm allows you to revert to the previous service configuration when an update fails or causes problems. Portainer exposes Swarm's built-in rollback capabilities through its UI, letting you configure automatic rollback triggers and manually initiate rollbacks when needed. This guide covers the complete rollback setup.

## Prerequisites

- Portainer on Docker Swarm
- Access to a Swarm manager node for CLI commands
- A service with at least one previous deployment (rollback requires a previous state)
- Understanding of service update configuration

## How Swarm Rollback Works

Docker Swarm keeps track of the previous service specification. When you update a service:

1. Swarm updates tasks according to the update config (parallelism, delay)
2. If enough updated tasks fail to start or stop running within the monitor period, and `failure_action` is set to `rollback`, the automatic rollback triggers
3. Swarm reverts to the previous configuration

You can also manually trigger a rollback at any time.

## Step 1: Configure Update Policy (Required for Auto-Rollback)

Rollback is triggered when an update fails. First, configure the update policy:

In the Portainer service editor under **Update/Rollback config**:

```text
Update configuration:
  Parallelism:     2        # Update 2 tasks at a time
  Delay:           10s      # Wait 10s between batches
  Failure action:  rollback # Automatically rollback on failure
  Monitor period:  30s      # Monitor this long after update
  Max failure ratio: 0.2    # Tolerate 20% failure before rollback
  Order:           start-first  # Start new before stopping old
```

In a Compose file:

```yaml
services:
  web:
    image: myapp:v2.0
    deploy:
      replicas: 4
      update_config:
        parallelism: 2          # Update 2 at a time
        delay: 10s              # 10s between batches
        failure_action: rollback  # Auto-rollback on failure
        monitor: 30s            # Monitor 30s per batch
        max_failure_ratio: 0.2  # Allow 20% failure rate
        order: start-first      # Zero-downtime: start new before stopping old
```

## Step 2: Configure Rollback Policy

Separately configure how the rollback itself behaves:

```yaml
services:
  web:
    deploy:
      rollback_config:
        parallelism: 2          # Rollback 2 tasks at a time
        delay: 5s               # Wait 5s between rollback batches
        failure_action: pause   # Pause if rollback itself fails
        monitor: 20s            # Monitor 20s per batch during rollback
        max_failure_ratio: 0.0  # No tolerance for rollback failures
        order: stop-first       # Stop current before starting old version
```

## Step 3: Test Auto-Rollback

Deploy a service with an intentionally broken image to test rollback:

```bash
# Deploy a good version first

docker service create \
  --name test-rollback \
  --replicas 3 \
  --update-failure-action rollback \
  nginx:alpine

# Attempt update to a bad image (nonexistent tag)
docker service update \
  --image nginx:does-not-exist \
  test-rollback

# Swarm will fail to pull and auto-rollback
```

Watch in Portainer's Services view - the service will temporarily show update failures and then revert.

## Step 4: Manually Trigger Rollback from Portainer

If a deployment is problematic and you want to rollback immediately:

1. Go to **Services** in Portainer
2. Click on the service name
3. Scroll to the **Update** section or action buttons
4. Click **Rollback the service**
5. Confirm the rollback

Portainer sends the rollback command to the Swarm manager.

## Step 5: Manually Trigger Rollback via CLI

```bash
# Rollback to previous service configuration
docker service rollback web-frontend

# Monitor the rollback
docker service ps web-frontend

# Check the service spec after rollback
docker service inspect web-frontend --pretty
```

## Step 6: Verify the Rollback

After rollback completes:

```bash
# Confirm the image version reverted
docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' web-frontend

# Check all tasks are running the old version
docker service ps web-frontend --filter desired-state=running
```

In Portainer, the service detail shows the current image and all running tasks.

## Understanding Rollback Limitations

- Rollback reverts to the **immediately previous** specification only (not arbitrary versions)
- Automatic rollback depends on the configured monitor window and failure threshold to detect a failed update
- Volume data and external state are NOT affected by rollback
- Swarm does not version application data

## Deployment Strategy for Safe Updates

Combine rollback with health checks for fully automated safe deployments:

```yaml
services:
  api:
    image: myapi:${VERSION}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      replicas: 4
      update_config:
        parallelism: 1          # One at a time for careful rollout
        delay: 15s
        failure_action: rollback
        monitor: 60s            # Long monitor window for health checks
        order: start-first
      rollback_config:
        parallelism: 0          # Rollback all simultaneously
        order: stop-first
```

With this configuration:
1. Swarm starts the new version one replica at a time
2. Monitors each updated replica for 60s after it starts
3. If an updated replica fails to start or stops running during that monitor window, automatic rollback begins
4. Rollback restores all tasks to the previous version simultaneously

## Conclusion

Service rollback is an essential safety net for production deployments on Docker Swarm. By configuring both update and rollback policies - and testing them proactively - you ensure that problematic deployments are caught quickly and automatically reversed. Portainer's rollback button also gives operators a manual escape hatch when automated rollback is not fast enough. Always test your rollback configuration in staging before relying on it in production.
